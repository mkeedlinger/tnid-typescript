// =============================================================================
// TNID Type Definitions
// =============================================================================

// -----------------------------------------------------------------------------
// Compile-time Name Validation Types
// -----------------------------------------------------------------------------

/** Valid characters for TNID names (5-bit encoding): 0-4, a-z */
export type NameChar =
  | "0"
  | "1"
  | "2"
  | "3"
  | "4"
  | "a"
  | "b"
  | "c"
  | "d"
  | "e"
  | "f"
  | "g"
  | "h"
  | "i"
  | "j"
  | "k"
  | "l"
  | "m"
  | "n"
  | "o"
  | "p"
  | "q"
  | "r"
  | "s"
  | "t"
  | "u"
  | "v"
  | "w"
  | "x"
  | "y"
  | "z";

/** Recursive validation - check one character at a time to avoid type explosion */
type ValidateNameChars<S extends string> = S extends "" ? true
  : S extends `${infer First}${infer Rest}`
    ? First extends NameChar ? ValidateNameChars<Rest>
    : false
  : false;

/** Check string length is 1-4 using tuple length trick */
type StringLength<S extends string, Acc extends unknown[] = []> = S extends ""
  ? Acc["length"]
  : S extends `${infer _}${infer Rest}` ? StringLength<Rest, [...Acc, unknown]>
  : never;

type ValidLength = 1 | 2 | 3 | 4;

/**
 * Validate a TNID name at compile time.
 * Must be 1-4 characters, each being a valid NameChar.
 */
export type ValidateName<S extends string> = ValidateNameChars<S> extends true
  ? StringLength<S> extends ValidLength ? S
  : never
  : never;

// -----------------------------------------------------------------------------
// Core Types
// -----------------------------------------------------------------------------

/**
 * A TNID value branded with its name. At runtime this is just a string.
 *
 * @example
 * ```ts
 * // Define a NamedTnid and matching type
 * const UserId = Tnid("user");
 * type UserId = TnidType<typeof UserId>;
 *
 * // Generate IDs
 * const id: UserId = UserId.new_v0();          // time-sortable
 * const id2: UserId = UserId.new_v1();         // high-entropy random
 *
 * // Parse from strings (auto-detects format)
 * const parsed = UserId.parse("user.abc...");  // TNID string format
 * const fromUuid = UserId.parse("d6157329-4640-8e30-...");  // UUID format
 *
 * // Or use explicit parse methods
 * UserId.parseTnidString("user.abc...");       // TNID string only
 * UserId.parseUuidString("d6157329-...");      // UUID string only
 *
 * // DynamicTnid - runtime name validation
 * DynamicTnid.newV0("item");                   // create with runtime name
 * DynamicTnid.newV1("item");                   // create with runtime name
 * DynamicTnid.parse("post.xyz...");            // parse any TNID (auto-detects)
 * DynamicTnid.getName(id);                     // "user"
 * DynamicTnid.getVariant(id);                  // "v0" | "v1" | "v2" | "v3"
 *
 * // UuidLike - wrapper for any UUID hex string
 * UuidLike.fromTnid(id);                       // TNID to UUID string
 * UuidLike.parse("d6157329-...");              // parse any UUID (format only)
 * UuidLike.toTnid(uuid);                       // UUID to DynamicTnid (validates)
 *
 * // Type safety: different names are incompatible
 * const PostId = Tnid("post");
 * type PostId = TnidType<typeof PostId>;
 * const postId: PostId = PostId.new_v0();
 * // id = postId;  // Compile error!
 *
 * // DynamicTnid type accepts any TNID
 * function log(id: DynamicTnid) { console.log(DynamicTnid.getName(id)); }
 * log(id);      // works
 * log(postId);  // works
 * ```
 */
export type TnidValue<Name extends string> = string & { tnid: Name };

/** TNID variant: v0=time-ordered, v1=random, v2/v3=reserved */
export type TnidVariant = "v0" | "v1" | "v2" | "v3";

/** Case for UUID hex string formatting. */
export type Case = "lower" | "upper";

// -----------------------------------------------------------------------------
// NamedTnid Interface
// -----------------------------------------------------------------------------

export interface NamedTnid<Name extends string> {
  /** The TNID name */
  readonly name: Name;

  /** Generate a new time-sortable TNID (variant 0) */
  new_v0(): TnidValue<Name>;

  /** Generate a new random TNID (variant 1) */
  new_v1(): TnidValue<Name>;

  /** Construct a V0 TNID from specific parts (for deterministic testing) */
  v0_from_parts(timestampMs: bigint, randomBits: bigint): TnidValue<Name>;

  /** Construct a V1 TNID from specific parts (for deterministic testing) */
  v1_from_parts(randomBits: bigint): TnidValue<Name>;

  /**
   * Parse a TNID from either TNID string format or UUID hex format (auto-detected).
   * @throws Error if the string is invalid or the name doesn't match
   */
  parse(s: string): TnidValue<Name>;

  /**
   * Parse and validate a TNID string (e.g., "user.Br2flcNDfF6LYICnT").
   * @throws Error if the string is invalid or the name doesn't match
   */
  parseTnidString(s: string): TnidValue<Name>;

  /**
   * Parse a UUID hex string into a TNID.
   * Validates that it's a valid UUIDv8 TNID and the name matches.
   * @throws Error if the UUID is invalid or the name doesn't match
   */
  parseUuidString(uuid: string): TnidValue<Name>;

  /** Get the name encoded as a 5-character hex string. */
  nameHex(): string;

  /** Get the variant of a TNID. */
  variant(id: TnidValue<Name>): TnidVariant;

  /** Convert a TNID to UUID hex string format. */
  toUuidString(id: TnidValue<Name>, caseFormat?: Case): string;
}

/** Extract the `TnidValue` type from a NamedTnid. */
export type TnidType<T> = T extends NamedTnid<infer N> ? TnidValue<N> : never;
