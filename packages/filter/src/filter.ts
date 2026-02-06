/**
 * Filtered TNID generation functions.
 *
 * Generate TNIDs guaranteed not to contain blocklisted substrings
 * in their data string representation.
 */

import { DynamicTnid, type NamedTnid, type TnidValue } from "@tnid/core";
import type { Blocklist } from "./blocklist.ts";
import {
  dataString,
  handleV0Match,
  randomBigInt,
  V0_RANDOM_BITS,
  V1_RANDOM_BITS,
} from "./internals.ts";

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
  const maxIterations = blocklist.limits().maxV0Iterations;
  let timestamp = blocklist.getStartingTimestamp();

  for (let i = 0; i < maxIterations; i++) {
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

  throw new FilterError(maxIterations);
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
  const maxIterations = blocklist.limits().maxV1Iterations;

  for (let i = 0; i < maxIterations; i++) {
    const random = randomBigInt(V1_RANDOM_BITS);
    const id = factory.v1_from_parts(random);
    const data = dataString(id);

    if (!blocklist.containsMatch(data)) {
      return id;
    }
  }

  throw new FilterError(maxIterations);
}

/**
 * Generate a V0 DynamicTnid whose data string contains no blocklisted words.
 *
 * Like {@link newV0Filtered} but accepts a runtime name string.
 *
 * @throws {FilterError} If maximum iterations exceeded.
 */
export function newDynamicV0Filtered(
  name: string,
  blocklist: Blocklist,
): DynamicTnid {
  const maxIterations = blocklist.limits().maxV0Iterations;
  let timestamp = blocklist.getStartingTimestamp();

  for (let i = 0; i < maxIterations; i++) {
    const random = randomBigInt(V0_RANDOM_BITS);
    const id = DynamicTnid.newV0WithParts(name, timestamp, random);
    const data = dataString(id);

    const match = blocklist.findFirstMatch(data);
    if (match === null) {
      blocklist.recordSafeTimestamp(timestamp);
      return id;
    }

    timestamp = handleV0Match(match, timestamp);
  }

  throw new FilterError(maxIterations);
}

/**
 * Generate a V1 DynamicTnid whose data string contains no blocklisted words.
 *
 * Like {@link newV1Filtered} but accepts a runtime name string.
 *
 * @throws {FilterError} If maximum iterations exceeded.
 */
export function newDynamicV1Filtered(
  name: string,
  blocklist: Blocklist,
): DynamicTnid {
  const maxIterations = blocklist.limits().maxV1Iterations;

  for (let i = 0; i < maxIterations; i++) {
    const random = randomBigInt(V1_RANDOM_BITS);
    const id = DynamicTnid.newV1WithRandom(name, random);
    const data = dataString(id);

    if (!blocklist.containsMatch(data)) {
      return id;
    }
  }

  throw new FilterError(maxIterations);
}
