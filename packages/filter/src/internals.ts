/**
 * Shared internals for filter functions.
 * @internal Not part of the public API.
 */

// V0 data string character layout:
// Chars 0-6: pure timestamp bits
// Char 7: 1 timestamp bit + 2 variant bits + 3 random bits
// Chars 8-16: pure random bits
export const FIRST_CHAR_WITH_RANDOM = 7;

export const V0_RANDOM_BITS = 57;
export const V1_RANDOM_BITS = 100;

/** Global last-known-safe timestamp to avoid re-discovering bad windows. */
export let lastSafeTimestamp = 0n;

export function recordSafeTimestamp(ts: bigint): void {
  if (ts > lastSafeTimestamp) {
    lastSafeTimestamp = ts;
  }
}

export function getStartingTimestamp(): bigint {
  const current = BigInt(Date.now());
  return current > lastSafeTimestamp ? current : lastSafeTimestamp;
}

/** Generate a random bigint with the specified number of bits. */
export function randomBigInt(bits: number): bigint {
  const bytes = new Uint8Array(Math.ceil(bits / 8));
  crypto.getRandomValues(bytes);
  let result = 0n;
  for (const b of bytes) result = (result << 8n) | BigInt(b);
  return result & ((1n << BigInt(bits)) - 1n);
}

/** Extract the 17-char data string from a TNID string. */
export function dataString(tnid: string): string {
  return tnid.substring(tnid.indexOf(".") + 1);
}

/**
 * Check if a match touches the random portion of V0 data string.
 * If true, regenerating random bits may resolve the match.
 * If false, the match is entirely in the timestamp portion and requires bumping.
 */
export function matchTouchesRandomPortion(start: number, length: number): boolean {
  return start + length > FIRST_CHAR_WITH_RANDOM;
}

/**
 * Minimum timestamp bump (in ms) needed to change the character at position `pos`.
 * Each character encodes 6 bits. Lower positions = more significant = larger bump.
 */
export function timestampBumpForChar(pos: number): bigint {
  return 1n << BigInt(42 - 6 * pos);
}

/**
 * Handle a V0 blocklist match: bump timestamp if match is in timestamp portion.
 * Returns the (possibly bumped) timestamp.
 */
export function handleV0Match(
  match: { start: number; length: number },
  timestamp: bigint,
): bigint {
  if (!matchTouchesRandomPortion(match.start, match.length)) {
    const rightmostChar = match.start + match.length - 1;
    return timestamp + timestampBumpForChar(rightmostChar);
  }
  return timestamp;
}
