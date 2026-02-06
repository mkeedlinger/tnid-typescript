/**
 * AES-128 block cipher wrapper using Web Crypto API.
 *
 * FF1 requires raw AES block cipher (AES-ECB), which Web Crypto doesn't expose.
 * We simulate AES-ECB using AES-CBC with a zero IV for single-block operations.
 */

// Web Crypto API accessor (same pattern as @tnid/core)
// deno-lint-ignore no-explicit-any
const crypto = (globalThis as any).crypto as {
  subtle: {
    // deno-lint-ignore no-explicit-any
    importKey(...args: any[]): Promise<CryptoKey>;
    // deno-lint-ignore no-explicit-any
    encrypt(...args: any[]): Promise<ArrayBuffer>;
  };
};

/**
 * AES-128 block cipher for FF1.
 * Caches the imported CryptoKey for efficiency.
 */
export class Aes128 {
  private keyPromise: Promise<CryptoKey>;

  constructor(keyOrPromise: Uint8Array | Promise<CryptoKey>) {
    if (keyOrPromise instanceof Promise) {
      this.keyPromise = keyOrPromise;
    } else {
      if (keyOrPromise.length !== 16) {
        throw new Error(
          `AES-128 key must be 16 bytes, got ${keyOrPromise.length}`,
        );
      }
      this.keyPromise = crypto.subtle.importKey(
        "raw",
        keyOrPromise,
        { name: "AES-CBC" },
        false,
        ["encrypt"],
      );
    }
  }

  /**
   * Import a raw key and return the CryptoKey promise.
   * Useful for caching the import across multiple Aes128 instances.
   */
  static importKey(keyBytes: Uint8Array): Promise<CryptoKey> {
    if (keyBytes.length !== 16) {
      throw new Error(`AES-128 key must be 16 bytes, got ${keyBytes.length}`);
    }
    return crypto.subtle.importKey(
      "raw",
      keyBytes,
      { name: "AES-CBC" },
      false,
      ["encrypt"],
    );
  }

  /**
   * Encrypts a single 16-byte block using AES-128.
   * Uses AES-CBC with zero IV, which is equivalent to AES-ECB for single blocks.
   */
  async encryptBlock(block: Uint8Array): Promise<Uint8Array> {
    if (block.length !== 16) {
      throw new Error(`AES block must be 16 bytes, got ${block.length}`);
    }

    const key = await this.keyPromise;
    const iv = new Uint8Array(16); // Zero IV

    // AES-CBC with zero IV for single block = AES-ECB
    const result = await crypto.subtle.encrypt(
      { name: "AES-CBC", iv },
      key,
      block,
    );

    // Result includes padding; we only need the first 16 bytes
    return new Uint8Array(result, 0, 16);
  }

  /**
   * AES-CBC-MAC: Chain multiple blocks using CBC mode.
   * Returns the final encrypted block (the MAC).
   */
  async cbcMac(blocks: Uint8Array[]): Promise<Uint8Array> {
    let state: Uint8Array = new Uint8Array(16); // Start with zero block

    for (const block of blocks) {
      // XOR state with block
      const xored = new Uint8Array(16);
      for (let i = 0; i < 16; i++) {
        xored[i] = state[i] ^ block[i];
      }
      // Encrypt and copy to new array to satisfy TypeScript
      const encrypted = await this.encryptBlock(xored);
      state = new Uint8Array(encrypted);
    }

    return state;
  }
}
