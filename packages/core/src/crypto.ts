// Web Crypto API accessor
// Isolates the type assertion to one place. Works in:
// - Browsers (globalThis.crypto)
// - Deno (globalThis.crypto)
// - Node.js 20+ (globalThis.crypto)

// deno-lint-ignore no-explicit-any
const _crypto = (globalThis as any).crypto;
if (!_crypto || typeof _crypto.getRandomValues !== "function") {
  throw new Error(
    "globalThis.crypto.getRandomValues is not available. " +
      "@tnid/core requires the Web Crypto API (Node.js 20+, Deno, or a modern browser).",
  );
}

export const crypto = _crypto as {
  getRandomValues<T extends ArrayBufferView>(array: T): T;
};
