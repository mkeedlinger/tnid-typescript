/**
 * Filtered TNID generation functions.
 *
 * Generate TNIDs guaranteed not to contain blocklisted substrings
 * in their data string representation.
 */

import type { NamedTnid, TnidValue } from "@tnid/core";
import type { Blocklist } from "./blocklist.ts";
import {
  dataString,
  handleV0Match,
  randomBigInt,
  V0_RANDOM_BITS,
  V1_RANDOM_BITS,
} from "./internals.ts";

const MAX_V0_ITERATIONS = 1_000;
const MAX_V1_ITERATIONS = 100;

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
  let timestamp = blocklist.getStartingTimestamp();

  for (let i = 0; i < MAX_V0_ITERATIONS; i++) {
    const random = randomBigInt(V0_RANDOM_BITS);
    const id = factory.v0_from_parts(timestamp, random);
    const data = dataString(id);

    const match = blocklist.findFirstMatch(data);
    if (match === null) {
      blocklist.recordSafeTimestamp(timestamp);
      return id;
    }

    timestamp = handleV0Match(match, timestamp);
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
