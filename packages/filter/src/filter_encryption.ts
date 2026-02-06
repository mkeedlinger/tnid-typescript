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
import type { Blocklist } from "./blocklist.ts";
import { FilterError } from "./filter.ts";
import {
  dataString,
  handleV0Match,
  randomBigInt,
  V0_RANDOM_BITS,
} from "./internals.ts";

// Re-export Blocklist and FilterError for convenience
export { Blocklist } from "./blocklist.ts";
export { FilterError };

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
  const maxIterations = blocklist.limits().maxEncryptionIterations;
  let timestamp = blocklist.getStartingTimestamp();

  for (let i = 0; i < maxIterations; i++) {
    const random = randomBigInt(V0_RANDOM_BITS);
    const v0 = factory.v0_from_parts(timestamp, random);
    const v0Data = dataString(v0);

    // Check V0 first
    const v0Match = blocklist.findFirstMatch(v0Data);
    if (v0Match !== null) {
      timestamp = handleV0Match(v0Match, timestamp);
      continue;
    }

    // V0 is clean, now check encrypted V1
    const v1 = await encryptV0ToV1(v0, key);
    const v1Data = dataString(v1);

    if (!blocklist.containsMatch(v1Data)) {
      blocklist.recordSafeTimestamp(timestamp);
      return v0;
    }
    // V1 had a match - regenerate (loop continues with new random)
  }

  throw new FilterError(maxIterations);
}
