// =============================================================================
// Data Encoding - 6-bit encoding for the data portion
// 64 characters in order: - 0-9 A-Z _ a-z
// =============================================================================

const DATA_CHAR_TO_VALUE: Record<string, number> = {};
const DATA_VALUE_TO_CHAR: string[] = [];

const DATA_ENCODING_ORDER =
  "-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz";
for (let i = 0; i < DATA_ENCODING_ORDER.length; i++) {
  const char = DATA_ENCODING_ORDER[i];
  DATA_CHAR_TO_VALUE[char] = i;
  DATA_VALUE_TO_CHAR[i] = char;
}

/** Number of characters in the encoded data portion of a TNID string. */
export const DATA_CHAR_ENCODING_LEN = 17;

// The data portion is 102 bits encoded as 17 6-bit characters (102 = 17 * 6)
//
// 128-bit layout (MSB = bit 0):
//   Bits 0-19:   Name (20 bits) - NOT in data encoding
//   Bits 20-47:  Payload A (28 bits)
//   Bits 48-51:  UUID version (4 bits) - NOT in data encoding
//   Bits 52-63:  Payload B (12 bits)
//   Bits 64-65:  UUID variant (2 bits) - NOT in data encoding
//   Bits 66-67:  TNID variant (2 bits)
//   Bits 68-127: Payload C (60 bits)
//
// Data bits = PayloadA(28) + PayloadB(12) + TNIDVariant(2) + PayloadC(60) = 102 bits

/**
 * Encode a 16-byte TNID value as a 17-character data string.
 */
export function encodeData(bytes: Uint8Array): string {
  // Convert bytes to BigInt (MSB first)
  let value = 0n;
  for (const byte of bytes) {
    value = (value << 8n) | BigInt(byte);
  }

  // Extract the parts (positions from LSB = 127 - MSB_position)
  // MSB bits 20-47 = LSB bits 80-107 (28 bits)
  const payloadA = (value >> 80n) & ((1n << 28n) - 1n);

  // MSB bits 52-63 = LSB bits 64-75 (12 bits)
  const payloadB = (value >> 64n) & ((1n << 12n) - 1n);

  // MSB bits 66-67 = LSB bits 60-61 (2 bits)
  const tnidVariant = (value >> 60n) & 0b11n;

  // MSB bits 68-127 = LSB bits 0-59 (60 bits)
  const payloadC = value & ((1n << 60n) - 1n);

  // Combine into 102 data bits: A(28) + B(12) + variant(2) + C(60)
  const dataBits = (payloadA << 74n) | (payloadB << 62n) |
    (tnidVariant << 60n) | payloadC;

  // Encode as 17 6-bit characters
  let result = "";
  for (let i = 16; i >= 0; i--) {
    const charValue = Number((dataBits >> BigInt(i * 6)) & 0x3fn);
    result += DATA_VALUE_TO_CHAR[charValue];
  }

  return result;
}

/**
 * Decode a 17-character data string to data bits and TNID variant.
 */
export function decodeData(
  encoded: string,
): { dataBits: bigint; tnidVariant: number } {
  if (encoded.length !== DATA_CHAR_ENCODING_LEN) {
    throw new Error(
      `Invalid data length: expected ${DATA_CHAR_ENCODING_LEN}, got ${encoded.length}`,
    );
  }

  let dataBits = 0n;
  for (let i = 0; i < 17; i++) {
    const char = encoded[i];
    const value = DATA_CHAR_TO_VALUE[char];
    if (value === undefined) {
      throw new Error(`Invalid data character: ${char}`);
    }
    dataBits = (dataBits << 6n) | BigInt(value);
  }

  // Extract TNID variant (bits 60-61 from the right of the 102-bit value)
  const tnidVariant = Number((dataBits >> 60n) & 0b11n);

  return { dataBits, tnidVariant };
}

/**
 * Convert data bits back to a 16-byte array.
 */
export function dataBitsToBytes(
  dataBits: bigint,
  nameBits: number,
): Uint8Array {
  // Reconstruct the full 128-bit value from 102 data bits
  // Data bits layout: payloadA(28) + payloadB(12) + tnid_var(2) + payloadC(60) = 102 bits
  //
  // 128-bit layout:
  //   name(20) + payloadA(28) + uuid_ver(4) + payloadB(12) + uuid_var(2) + tnid_var(2) + payloadC(60)

  // Extract from dataBits (102 bits total):
  const payloadA = (dataBits >> 74n) & ((1n << 28n) - 1n); // bits 74-101
  const payloadB = (dataBits >> 62n) & ((1n << 12n) - 1n); // bits 62-73
  const tnidVariant = (dataBits >> 60n) & 0b11n; // bits 60-61
  const payloadC = dataBits & ((1n << 60n) - 1n); // bits 0-59

  // Reconstruct 128-bit value
  let value = BigInt(nameBits);
  value = (value << 28n) | payloadA;
  value = (value << 4n) | 0x8n; // UUID version 8
  value = (value << 12n) | payloadB;
  value = (value << 2n) | 0b10n; // UUID variant
  value = (value << 2n) | tnidVariant;
  value = (value << 60n) | payloadC;

  // Convert to bytes
  const bytes = new Uint8Array(16);
  for (let i = 15; i >= 0; i--) {
    bytes[i] = Number(value & 0xffn);
    value >>= 8n;
  }

  return bytes;
}
