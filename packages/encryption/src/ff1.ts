/**
 * FF1 Format-Preserving Encryption (NIST SP 800-38G).
 *
 * This implementation uses AES-128 as the underlying cipher.
 * FF1 is a Feistel cipher that encrypts strings of numerals
 * while preserving their format (length and radix).
 */

import { Aes128 } from "./aes.ts";

/**
 * Ceiling division: ceil(a / b)
 */
function ceilDiv(a: number, b: number): number {
  return Math.ceil(a / b);
}

/**
 * Convert a number array (base radix) to a bigint.
 * Most significant digit first.
 */
function numArrayToBigInt(arr: number[], radix: number): bigint {
  let result = 0n;
  const radixBig = BigInt(radix);
  for (const digit of arr) {
    result = result * radixBig + BigInt(digit);
  }
  return result;
}

/**
 * Convert a bigint to a number array (base radix) with specified length.
 * Most significant digit first. Pads with zeros if needed.
 */
function bigIntToNumArray(value: bigint, radix: number, length: number): number[] {
  const result: number[] = new Array(length).fill(0);
  const radixBig = BigInt(radix);
  let v = value;

  for (let i = length - 1; i >= 0 && v > 0n; i--) {
    result[i] = Number(v % radixBig);
    v = v / radixBig;
  }

  return result;
}

/**
 * Convert bigint to big-endian byte array with specified length.
 */
function bigIntToBytes(value: bigint, length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  let v = value;
  for (let i = length - 1; i >= 0 && v > 0n; i--) {
    bytes[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return bytes;
}

/**
 * Convert byte array to bigint (big-endian).
 */
function bytesToBigInt(bytes: Uint8Array): bigint {
  let result = 0n;
  for (const byte of bytes) {
    result = (result << 8n) | BigInt(byte);
  }
  return result;
}

/**
 * Concatenate multiple Uint8Arrays.
 */
function concat(...arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

/**
 * FF1 Format-Preserving Encryption cipher.
 *
 * Encrypts/decrypts a string of numerals (digits in base `radix`)
 * while preserving the format.
 */
export class FF1 {
  private aes: Aes128;
  private radix: number;

  /**
   * Create an FF1 cipher with the given key and radix.
   *
   * @param key 16-byte AES key
   * @param radix Base of the numeral system (2-65536)
   */
  constructor(key: Uint8Array, radix: number) {
    if (radix < 2 || radix > 65536) {
      throw new Error(`Radix must be in range [2, 65536], got ${radix}`);
    }
    this.aes = new Aes128(key);
    this.radix = radix;
  }

  /**
   * FF1 encryption.
   *
   * @param tweak Additional data (can be empty)
   * @param plaintext Array of numerals (each in range [0, radix))
   * @returns Encrypted numeral array of same length
   */
  encrypt(tweak: Uint8Array, plaintext: number[]): Promise<number[]> {
    return this.cipher(tweak, plaintext, true);
  }

  /**
   * FF1 decryption.
   *
   * @param tweak Additional data (must match encryption)
   * @param ciphertext Array of numerals
   * @returns Decrypted numeral array
   */
  decrypt(tweak: Uint8Array, ciphertext: number[]): Promise<number[]> {
    return this.cipher(tweak, ciphertext, false);
  }

  /**
   * Core FF1 Feistel cipher (10 rounds).
   */
  private async cipher(
    tweak: Uint8Array,
    input: number[],
    encrypting: boolean,
  ): Promise<number[]> {
    const n = input.length;
    const t = tweak.length;
    const radix = this.radix;

    // Split into two halves
    const u = Math.floor(n / 2);
    const v = n - u;

    // A gets first u elements, B gets last v elements
    let A = input.slice(0, u);
    let B = input.slice(u);

    // Precompute constants per spec
    // b = ceil(ceil(v * log2(radix)) / 8) - number of bytes to represent NUM_radix(B)
    const b = Math.ceil(Math.ceil(v * Math.log2(radix)) / 8);
    // d = 4 * ceil(b/4) + 4 - length of S (multiple of 4, at least 4 more than b)
    const d = 4 * ceilDiv(b, 4) + 4;

    // P = [1, 2, 1, radix (3 bytes), 10, u mod 256, n (4 bytes), t (4 bytes)]
    const P = new Uint8Array(16);
    P[0] = 1;
    P[1] = 2;
    P[2] = 1;
    // radix as 3 bytes (big-endian, upper 8 bits then lower 16 bits)
    P[3] = (radix >> 16) & 0xff;
    P[4] = (radix >> 8) & 0xff;
    P[5] = radix & 0xff;
    P[6] = 10; // Number of rounds
    P[7] = u & 0xff;
    // n as 4 bytes big-endian
    P[8] = (n >> 24) & 0xff;
    P[9] = (n >> 16) & 0xff;
    P[10] = (n >> 8) & 0xff;
    P[11] = n & 0xff;
    // t as 4 bytes big-endian
    P[12] = (t >> 24) & 0xff;
    P[13] = (t >> 16) & 0xff;
    P[14] = (t >> 8) & 0xff;
    P[15] = t & 0xff;

    // 10 Feistel rounds
    const rounds = encrypting ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] : [9, 8, 7, 6, 5, 4, 3, 2, 1, 0];

    for (const i of rounds) {
      // Determine m based on round parity
      const m = (i % 2 === 0) ? u : v;

      // Build Q: tweak || zeros || round || numB
      // Q length must be multiple of 16
      const numB = numArrayToBigInt(encrypting ? B : A, radix);
      const numBBytes = bigIntToBytes(numB, b);

      // Q = tweak || 0^(-t-b-1 mod 16) || i || [NUM_radix(B)]
      const padLen = (16 - ((t + b + 1) % 16)) % 16;
      const Q = concat(
        tweak,
        new Uint8Array(padLen),
        new Uint8Array([i]),
        numBBytes,
      );

      // R = PRF(P || Q)
      // PRF uses AES-CBC-MAC over (P || Q) with blocks of 16 bytes
      const pq = concat(P, Q);
      const numBlocks = pq.length / 16;
      const blocks: Uint8Array[] = [];
      for (let j = 0; j < numBlocks; j++) {
        blocks.push(pq.slice(j * 16, (j + 1) * 16));
      }
      const R = await this.aes.cbcMac(blocks);

      // S = first d bytes of R || CIPH(R ⊕ [1]) || CIPH(R ⊕ [2]) || ...
      const S = new Uint8Array(d);
      const rCopyLen = Math.min(16, d);
      S.set(R.slice(0, rCopyLen), 0);
      let sOffset = rCopyLen;
      let counter = 1;
      while (sOffset < d) {
        // R XOR counter (counter as 16-byte big-endian)
        const counterBlock = new Uint8Array(16);
        counterBlock[15] = counter & 0xff;
        counterBlock[14] = (counter >> 8) & 0xff;
        counterBlock[13] = (counter >> 16) & 0xff;
        counterBlock[12] = (counter >> 24) & 0xff;

        const xored = new Uint8Array(16);
        for (let k = 0; k < 16; k++) {
          xored[k] = R[k] ^ counterBlock[k];
        }

        const block = await this.aes.encryptBlock(xored);
        const copyLen = Math.min(16, d - sOffset);
        S.set(block.slice(0, copyLen), sOffset);
        sOffset += copyLen;
        counter++;
      }

      // y = NUM(S) - interpret S as big-endian number
      const y = bytesToBigInt(S);

      // c = (NUM_radix(A/B) + y) mod radix^m (encrypt)
      // c = (NUM_radix(A/B) - y) mod radix^m (decrypt)
      const radixPowM = BigInt(radix) ** BigInt(m);
      const numSrc = numArrayToBigInt(encrypting ? A : B, radix);

      let c: bigint;
      if (encrypting) {
        c = (numSrc + y) % radixPowM;
      } else {
        // For modular subtraction, add radixPowM to handle negative
        c = ((numSrc - y) % radixPowM + radixPowM) % radixPowM;
      }

      // C = STR_m_radix(c)
      const C = bigIntToNumArray(c, radix, m);

      // Swap: A = B, B = C (encrypt) or B = A, A = C (decrypt)
      if (encrypting) {
        A = B;
        B = C;
      } else {
        B = A;
        A = C;
      }
    }

    // Return A || B
    return [...A, ...B];
  }
}
