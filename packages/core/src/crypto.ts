// Web Crypto API accessor
// Isolates the type assertion to one place. Works in:
// - Browsers (globalThis.crypto)
// - Deno (globalThis.crypto)
// - Node.js 20+ (globalThis.crypto)

// deno-lint-ignore no-explicit-any
export const crypto = (globalThis as any).crypto as {
  getRandomValues<T extends ArrayBufferView>(array: T): T;
};
