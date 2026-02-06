/**
 * @tnid/filter - Blocklist filtering for TNID generation
 *
 * Generate TNIDs guaranteed not to contain specified substrings
 * (e.g., profanity) in their string representation.
 *
 * @example
 * ```typescript
 * import { Tnid } from "@tnid/core";
 * import { Blocklist, newV0Filtered, newV1Filtered } from "@tnid/filter";
 *
 * const UserId = Tnid("user");
 * const blocklist = new Blocklist(["TACO", "FOO"]);
 *
 * const v0 = newV0Filtered(UserId, blocklist);
 * const v1 = newV1Filtered(UserId, blocklist);
 * ```
 *
 * For encryption-aware filtering, use the `@tnid/filter/encryption` entry point.
 *
 * @module
 */

export { Blocklist } from "./blocklist.ts";
export { FilterError, newV0Filtered, newV1Filtered } from "./filter.ts";
