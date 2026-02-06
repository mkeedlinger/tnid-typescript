/**
 * @tnid/filter/encryption - Encryption-aware blocklist filtering
 *
 * Generate V0 TNIDs where both the V0 and its encrypted V1 form
 * contain no blocklisted words.
 *
 * @example
 * ```typescript
 * import { Tnid } from "@tnid/core";
 * import { EncryptionKey } from "@tnid/encryption";
 * import { Blocklist } from "@tnid/filter";
 * import { newV0FilteredForEncryption } from "@tnid/filter/encryption";
 *
 * const UserId = Tnid("user");
 * const blocklist = new Blocklist(["TACO", "FOO"]);
 * const key = EncryptionKey.fromHex("0102030405060708090a0b0c0d0e0f10");
 *
 * const id = await newV0FilteredForEncryption(UserId, blocklist, key);
 * ```
 *
 * @module
 */

import type { NamedTnid, TnidValue } from "@tnid/core";
import { type EncryptionKey, encryptV0ToV1 } from "@tnid/encryption";
import { Blocklist } from "./blocklist.ts";
import { FilterError } from "./filter.ts";

// Re-export Blocklist and FilterError for convenience
export { Blocklist, FilterError };

const FIRST_CHAR_WITH_RANDOM = 7;
const MAX_ENCRYPTION_ITERATIONS = 1_000;
const V0_RANDOM_BITS = 57;

let lastSafeTimestamp = 0n;

function randomBigInt(bits: number): bigint {
  const bytes = new Uint8Array(Math.ceil(bits / 8));
  crypto.getRandomValues(bytes);
  let result = 0n;
  for (const b of bytes) result = (result << 8n) | BigInt(b);
  return result & ((1n << BigInt(bits)) - 1n);
}

function dataString(tnid: string): string {
  return tnid.substring(tnid.indexOf(".") + 1);
}

function matchTouchesRandomPortion(start: number, length: number): boolean {
  return start + length > FIRST_CHAR_WITH_RANDOM;
}

function timestampBumpForChar(pos: number): bigint {
  return 1n << BigInt(42 - 6 * pos);
}

/**
 * Generate a V0 TNID where both the V0 and its encrypted V1 form
 * contain no blocklisted words.
 *
 * Requires the V0/V1 Encryption extension.
 *
 * @throws {FilterError} If maximum iterations exceeded.
 *
 * @example
 * ```typescript
 * import { Tnid } from "@tnid/core";
 * import { EncryptionKey } from "@tnid/encryption";
 * import { Blocklist } from "@tnid/filter";
 * import { newV0FilteredForEncryption } from "@tnid/filter/encryption";
 *
 * const UserId = Tnid("user");
 * const blocklist = new Blocklist(["TACO", "FOO"]);
 * const key = EncryptionKey.fromHex("0102030405060708090a0b0c0d0e0f10");
 *
 * const id = await newV0FilteredForEncryption(UserId, blocklist, key);
 * ```
 */
export async function newV0FilteredForEncryption<Name extends string>(
  factory: NamedTnid<Name>,
  blocklist: Blocklist,
  key: EncryptionKey,
): Promise<TnidValue<Name>> {
  const currentTime = BigInt(Date.now());
  let timestamp = currentTime > lastSafeTimestamp
    ? currentTime
    : lastSafeTimestamp;

  for (let i = 0; i < MAX_ENCRYPTION_ITERATIONS; i++) {
    const random = randomBigInt(V0_RANDOM_BITS);
    const v0 = factory.v0_from_parts(timestamp, random);
    const v0Data = dataString(v0);

    // Check V0 first
    const v0Match = blocklist.findFirstMatch(v0Data);
    if (v0Match !== null) {
      if (!matchTouchesRandomPortion(v0Match.start, v0Match.length)) {
        const rightmostChar = v0Match.start + v0Match.length - 1;
        timestamp += timestampBumpForChar(rightmostChar);
      }
      continue;
    }

    // V0 is clean, now check encrypted V1
    const v1 = await encryptV0ToV1(v0, key);
    const v1Data = dataString(v1);

    if (!blocklist.containsMatch(v1Data)) {
      lastSafeTimestamp = timestamp;
      return v0;
    }
    // V1 had a match - regenerate (loop continues with new random)
  }

  throw new FilterError(MAX_ENCRYPTION_ITERATIONS);
}
