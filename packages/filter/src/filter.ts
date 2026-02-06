/**
 * Filtered TNID generation functions.
 *
 * Generate TNIDs guaranteed not to contain blocklisted substrings
 * in their data string representation.
 */

import type { NamedTnid, TnidValue } from "@tnid/core";
import { Blocklist } from "./blocklist.ts";

// V0 data string character layout:
// Chars 0-6: pure timestamp bits
// Char 7: 1 timestamp bit + 2 variant bits + 3 random bits
// Chars 8-16: pure random bits
const FIRST_CHAR_WITH_RANDOM = 7;

const MAX_V0_ITERATIONS = 1000;
const MAX_V1_ITERATIONS = 100;

const V0_RANDOM_BITS = 57;
const V1_RANDOM_BITS = 100;

/** Global last-known-safe timestamp to avoid re-discovering bad windows. */
let lastSafeTimestamp = 0n;

/** Generate a random bigint with the specified number of bits. */
function randomBigInt(bits: number): bigint {
  const bytes = new Uint8Array(Math.ceil(bits / 8));
  crypto.getRandomValues(bytes);
  let result = 0n;
  for (const b of bytes) result = (result << 8n) | BigInt(b);
  return result & ((1n << BigInt(bits)) - 1n);
}

/** Extract the 17-char data string from a TNID string. */
function dataString(tnid: string): string {
  return tnid.substring(tnid.indexOf(".") + 1);
}

/**
 * Check if a match touches the random portion of V0 data string.
 * If true, regenerating random bits may resolve the match.
 * If false, the match is entirely in the timestamp portion and requires bumping.
 */
function matchTouchesRandomPortion(start: number, length: number): boolean {
  return start + length > FIRST_CHAR_WITH_RANDOM;
}

/**
 * Minimum timestamp bump (in ms) needed to change the character at position `pos`.
 * Each character encodes 6 bits. Lower positions = more significant = larger bump.
 */
function timestampBumpForChar(pos: number): bigint {
  return 1n << BigInt(42 - 6 * pos);
}

/** Error thrown when filtered generation exceeds the iteration limit. */
export class FilterError extends Error {
  readonly iterations: number;

  constructor(iterations: number) {
    super(
      `failed to generate clean ID after ${iterations} iterations; blocklist may be too restrictive`,
    );
    this.name = "FilterError";
    this.iterations = iterations;
  }
}

/**
 * Generate a V0 TNID whose data string contains no blocklisted words.
 *
 * Uses smart timestamp bumping when a match is in the timestamp portion,
 * and random regeneration when a match touches the random portion.
 *
 * @throws {FilterError} If maximum iterations exceeded.
 *
 * @example
 * ```typescript
 * import { Tnid } from "@tnid/core";
 * import { Blocklist, newV0Filtered } from "@tnid/filter";
 *
 * const UserId = Tnid("user");
 * const blocklist = new Blocklist(["TACO", "FOO"]);
 * const id = newV0Filtered(UserId, blocklist);
 * ```
 */
export function newV0Filtered<Name extends string>(
  factory: NamedTnid<Name>,
  blocklist: Blocklist,
): TnidValue<Name> {
  const currentTime = BigInt(Date.now());
  let timestamp = currentTime > lastSafeTimestamp
    ? currentTime
    : lastSafeTimestamp;

  for (let i = 0; i < MAX_V0_ITERATIONS; i++) {
    const random = randomBigInt(V0_RANDOM_BITS);
    const id = factory.v0_from_parts(timestamp, random);
    const data = dataString(id);

    const match = blocklist.findFirstMatch(data);
    if (match === null) {
      lastSafeTimestamp = timestamp;
      return id;
    }

    if (!matchTouchesRandomPortion(match.start, match.length)) {
      // Match entirely in timestamp portion - bump past the bad window
      const rightmostChar = match.start + match.length - 1;
      timestamp += timestampBumpForChar(rightmostChar);
    }
    // Otherwise: match touches random portion, just loop to regenerate
  }

  throw new FilterError(MAX_V0_ITERATIONS);
}

/**
 * Generate a V1 TNID whose data string contains no blocklisted words.
 *
 * Since all V1 bits are random, simply regenerates until clean.
 *
 * @throws {FilterError} If maximum iterations exceeded.
 *
 * @example
 * ```typescript
 * import { Tnid } from "@tnid/core";
 * import { Blocklist, newV1Filtered } from "@tnid/filter";
 *
 * const UserId = Tnid("user");
 * const blocklist = new Blocklist(["TACO", "FOO"]);
 * const id = newV1Filtered(UserId, blocklist);
 * ```
 */
export function newV1Filtered<Name extends string>(
  factory: NamedTnid<Name>,
  blocklist: Blocklist,
): TnidValue<Name> {
  for (let i = 0; i < MAX_V1_ITERATIONS; i++) {
    const random = randomBigInt(V1_RANDOM_BITS);
    const id = factory.v1_from_parts(random);
    const data = dataString(id);

    if (!blocklist.containsMatch(data)) {
      return id;
    }
  }

  throw new FilterError(MAX_V1_ITERATIONS);
}
