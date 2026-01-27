// =============================================================================
// TNID TypeScript Implementation
// =============================================================================

// -----------------------------------------------------------------------------
// Name Encoding - Valid characters for TNID names (5-bit encoding)
// Valid: 0-4, a-z (31 chars + null terminator = 32 = 2^5)
// -----------------------------------------------------------------------------

type NameChar =
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

// Recursive validation - check one character at a time to avoid type explosion
// This validates that a string consists only of NameChars
type ValidateNameChars<S extends string> = S extends "" ? true
  : S extends `${infer First}${infer Rest}`
    ? First extends NameChar ? ValidateNameChars<Rest>
    : false
  : false;

// Check string length is 1-4 using tuple length trick
type StringLength<S extends string, Acc extends unknown[] = []> = S extends ""
  ? Acc["length"]
  : S extends `${infer _}${infer Rest}` ? StringLength<Rest, [...Acc, unknown]>
  : never;

type ValidLength = 1 | 2 | 3 | 4;

// Validate a TNID name at compile time
// Must be 1-4 characters, each being a valid NameChar
type ValidateName<S extends string> = ValidateNameChars<S> extends true
  ? StringLength<S> extends ValidLength ? S
  : never
  : never;

// Helper to check if a name is valid (returns the name or never)
type IsValidName<S extends string> = ValidateName<S> extends never ? false
  : true;

// -----------------------------------------------------------------------------
// Data Encoding - 64 characters for the data portion (6-bit encoding)
// Order: - 0-9 A-Z _ a-z
// -----------------------------------------------------------------------------

// Create lookup tables for data encoding
// Order per spec: - 0-9 A-Z _ a-z (64 chars for 6-bit encoding)
// Note: _ is at position 37 (between Z and a), NOT at the end!
const DATA_CHAR_TO_VALUE: Record<string, number> = {};
const DATA_VALUE_TO_CHAR: string[] = [];

const DATA_ENCODING_ORDER =
  "-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz";
for (let i = 0; i < DATA_ENCODING_ORDER.length; i++) {
  const char = DATA_ENCODING_ORDER[i];
  DATA_CHAR_TO_VALUE[char] = i;
  DATA_VALUE_TO_CHAR[i] = char;
}

// -----------------------------------------------------------------------------
// Name Encoding/Decoding
// -----------------------------------------------------------------------------

const NAME_CHAR_TO_VALUE: Record<string, number> = {
  "0": 1,
  "1": 2,
  "2": 3,
  "3": 4,
  "4": 5,
  a: 6,
  b: 7,
  c: 8,
  d: 9,
  e: 10,
  f: 11,
  g: 12,
  h: 13,
  i: 14,
  j: 15,
  k: 16,
  l: 17,
  m: 18,
  n: 19,
  o: 20,
  p: 21,
  q: 22,
  r: 23,
  s: 24,
  t: 25,
  u: 26,
  v: 27,
  w: 28,
  x: 29,
  y: 30,
  z: 31,
};

const NAME_VALUE_TO_CHAR: Record<number, string> = {};
for (const [char, value] of Object.entries(NAME_CHAR_TO_VALUE)) {
  NAME_VALUE_TO_CHAR[value] = char;
}

function encodeName(name: string): number {
  // Encode name into 20 bits (4 chars * 5 bits each)
  // Null-pad on the right (least significant bits)
  let result = 0;
  for (let i = 0; i < 4; i++) {
    result <<= 5;
    if (i < name.length) {
      const value = NAME_CHAR_TO_VALUE[name[i]];
      if (value === undefined) {
        throw new Error(`Invalid name character: ${name[i]}`);
      }
      result |= value;
    }
    // else: null (0) is already the default
  }
  return result;
}

function decodeName(encoded: number): string {
  // Decode 20 bits back to name string
  let result = "";
  for (let i = 0; i < 4; i++) {
    const shift = (3 - i) * 5;
    const value = (encoded >> shift) & 0x1f;
    if (value === 0) break; // null terminator
    const char = NAME_VALUE_TO_CHAR[value];
    if (!char) {
      throw new Error(`Invalid encoded name value: ${value}`);
    }
    result += char;
  }
  return result;
}

// -----------------------------------------------------------------------------
// Branded Type System
// -----------------------------------------------------------------------------

/**
 * A TNID value branded with its name. At runtime this is just a string.
 *
 * @example
 * ```ts
 * // Define a factory and matching type
 * const UserId = Tnid("user");
 * type UserId = TnidType<typeof UserId>;
 *
 * // Generate IDs
 * const id: UserId = UserId.new_v0();          // time-sortable
 * const id2: UserId = UserId.new_v1();         // high-entropy random
 *
 * // Parse from strings
 * const parsed = UserId.parse("user.abc...");  // validates name matches
 * const fromUuid = UserId.parseUuidString("d6157329-4640-8e30-...");
 *
 * // DynamicTnid - runtime name validation
 * DynamicTnid.new_v0("item");                  // create with runtime name
 * DynamicTnid.new_v1("item");                  // create with runtime name
 * DynamicTnid.parse("post.xyz...");            // parse any TNID
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

/** A TNID that can hold any name. Use for generic functions. */
export type DynamicTnid = TnidValue<string>;

/** TNID variant: v0=time-ordered, v1=random, v2/v3=reserved */
export type TnidVariant = "v0" | "v1" | "v2" | "v3";

/** Case for UUID hex string formatting. */
export type Case = "lower" | "upper";

/** Static methods for working with any TNID regardless of name. */
export const DynamicTnid = {
  /** Generate a new time-sortable TNID (variant 0) with runtime name validation. */
  new_v0(name: string): DynamicTnid {
    if (!isValidNameRuntime(name)) {
      throw new Error(
        `Invalid TNID name: "${name}". Must be 1-4 characters of: 0-4, a-z`,
      );
    }
    const nameBits = encodeName(name);
    const bytes = generateV0(nameBits);
    const dataEncoded = encodeData(bytes);
    return `${name}.${dataEncoded}` as DynamicTnid;
  },
  /** Alias for new_v0. */
  new_time_ordered(name: string): DynamicTnid {
    return DynamicTnid.new_v0(name);
  },
  /** Generate a new time-sortable TNID with a specific timestamp. */
  new_v0_with_time(name: string, time: Date): DynamicTnid {
    if (!isValidNameRuntime(name)) {
      throw new Error(
        `Invalid TNID name: "${name}". Must be 1-4 characters of: 0-4, a-z`,
      );
    }
    const nameBits = encodeName(name);
    const timestampMs = BigInt(time.getTime());
    const bytes = generateV0(nameBits, timestampMs);
    const dataEncoded = encodeData(bytes);
    return `${name}.${dataEncoded}` as DynamicTnid;
  },
  /** Generate a new time-sortable TNID with explicit timestamp and random components. */
  new_v0_with_parts(
    name: string,
    epochMillis: bigint,
    random: bigint,
  ): DynamicTnid {
    if (!isValidNameRuntime(name)) {
      throw new Error(
        `Invalid TNID name: "${name}". Must be 1-4 characters of: 0-4, a-z`,
      );
    }
    const nameBits = encodeName(name);
    const bytes = generateV0(nameBits, epochMillis, random);
    const dataEncoded = encodeData(bytes);
    return `${name}.${dataEncoded}` as DynamicTnid;
  },
  /** Generate a new high-entropy TNID (variant 1) with runtime name validation. */
  new_v1(name: string): DynamicTnid {
    if (!isValidNameRuntime(name)) {
      throw new Error(
        `Invalid TNID name: "${name}". Must be 1-4 characters of: 0-4, a-z`,
      );
    }
    const nameBits = encodeName(name);
    const bytes = generateV1(nameBits);
    const dataEncoded = encodeData(bytes);
    return `${name}.${dataEncoded}` as DynamicTnid;
  },
  /** Alias for new_v1. */
  new_high_entropy(name: string): DynamicTnid {
    return DynamicTnid.new_v1(name);
  },
  /** Generate a new high-entropy TNID with explicit random bits. */
  new_v1_with_random(name: string, randomBits: bigint): DynamicTnid {
    if (!isValidNameRuntime(name)) {
      throw new Error(
        `Invalid TNID name: "${name}". Must be 1-4 characters of: 0-4, a-z`,
      );
    }
    const nameBits = encodeName(name);
    const bytes = generateV1(nameBits, randomBits);
    const dataEncoded = encodeData(bytes);
    return `${name}.${dataEncoded}` as DynamicTnid;
  },
  /** Parse any valid TNID string. */
  parse(s: string): DynamicTnid {
    return parseDynamicTnidImpl(s);
  },
  /** Parse a UUID hex string into a DynamicTnid (validates TNID structure). */
  parse_uuid_string(uuid: string): DynamicTnid {
    return parseDynamicUuidStringImpl(uuid);
  },
  /** Get the name from a TNID. */
  getName(id: DynamicTnid): string {
    return getTnidNameImpl(id);
  },
  /** Get the name encoded as a 5-character hex string. */
  getNameHex(id: DynamicTnid): string {
    return getNameHexImpl(id);
  },
  /** Get the variant of a TNID. */
  getVariant(id: DynamicTnid): TnidVariant {
    return getTnidVariantImpl(id);
  },
  /** Convert to UUID hex string format. */
  toUuidString(id: DynamicTnid, caseFormat: Case = "lower"): string {
    return toUuidStringImpl(id, caseFormat === "upper");
  },
} as const;

/** A UUID hex string (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx) that may or may not be a valid TNID or UUID. */
export type UuidLike = string & { __uuidlike: true };

/** Wrapper for UUID hex strings that may or may not be valid TNIDs. */
export const UuidLike = {
  /** Create from a TNID (always valid). */
  fromTnid(id: DynamicTnid): UuidLike {
    return toUuidStringImpl(id, false) as UuidLike;
  },
  /** Parse UUID hex string (format validation only, not TNID validation). */
  parse(s: string): UuidLike {
    // Validate format only
    if (!UUID_REGEX.test(s)) {
      throw new Error(`Invalid UUID format: ${s}`);
    }
    return s.toLowerCase() as UuidLike;
  },
  /** Try to convert to DynamicTnid (validates TNID structure). */
  toTnid(uuid: UuidLike): DynamicTnid {
    const value = parseUuidStringToValue(uuid);
    if (!validateUuidBits(value)) {
      throw new Error("Invalid TNID: not a valid UUIDv8");
    }
    const nameBits = extractNameBitsFromValue(value);
    const name = decodeName(nameBits);
    if (!isValidNameRuntime(name)) {
      throw new Error("Invalid TNID: invalid name encoding");
    }
    return valueToTnidString(value) as DynamicTnid;
  },
  /** Format as uppercase UUID hex string. */
  toUpperCase(uuid: UuidLike): UuidLike {
    return (uuid as string).toUpperCase() as UuidLike;
  },
} as const;

// -----------------------------------------------------------------------------
// TNID Factory Type
// -----------------------------------------------------------------------------

export interface TnidFactory<Name extends string> {
  /** The TNID name this factory creates IDs for */
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
   * Parse and validate a TNID string.
   * @throws Error if the string is invalid or the name doesn't match
   */
  parse(s: string): TnidValue<Name>;

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

/** Extract the `TnidValue` type from a factory. */
export type TnidType<F> = F extends TnidFactory<infer N> ? TnidValue<N> : never;

// -----------------------------------------------------------------------------
// TNID Data Encoding/Decoding
// -----------------------------------------------------------------------------

// The data portion is 102 bits encoded as 17 6-bit characters (102 = 17 * 6)
//
// 128-bit layout (MSB = bit 0):
//   Bits 0-19:   Name (20 bits) - NOT in data encoding
//   Bits 20-47:  Payload A (28 bits)
//   Bits 48-51:  UUID version (4 bits) - NOT in data encoding
//   Bits 52-63:  Payload B (12 bits)
//   Bits 64-65:  UUID variant (2 bits) - NOT in data encoding
//   Bits 66-67:  TNID variant (2 bits)
//   Bits 68-127: Payload C (60 bits)
//
// Data bits = PayloadA(28) + PayloadB(12) + TNIDVariant(2) + PayloadC(60) = 102 bits

function encodeData(bytes: Uint8Array): string {
  // Convert bytes to BigInt (MSB first)
  let value = 0n;
  for (const byte of bytes) {
    value = (value << 8n) | BigInt(byte);
  }

  // Extract the parts (positions from LSB = 127 - MSB_position)
  // MSB bits 20-47 = LSB bits 80-107 (28 bits)
  const payloadA = (value >> 80n) & ((1n << 28n) - 1n);

  // MSB bits 52-63 = LSB bits 64-75 (12 bits)
  const payloadB = (value >> 64n) & ((1n << 12n) - 1n);

  // MSB bits 66-67 = LSB bits 60-61 (2 bits)
  const tnidVariant = (value >> 60n) & 0b11n;

  // MSB bits 68-127 = LSB bits 0-59 (60 bits)
  const payloadC = value & ((1n << 60n) - 1n);

  // Combine into 102 data bits: A(28) + B(12) + variant(2) + C(60)
  const dataBits = (payloadA << 74n) | (payloadB << 62n) |
    (tnidVariant << 60n) | payloadC;

  // Encode as 17 6-bit characters
  let result = "";
  for (let i = 16; i >= 0; i--) {
    const charValue = Number((dataBits >> BigInt(i * 6)) & 0x3fn);
    result += DATA_VALUE_TO_CHAR[charValue];
  }

  return result;
}

function decodeData(
  encoded: string,
): { dataBits: bigint; tnidVariant: number } {
  if (encoded.length !== 17) {
    throw new Error(`Invalid data length: expected 17, got ${encoded.length}`);
  }

  let dataBits = 0n;
  for (let i = 0; i < 17; i++) {
    const char = encoded[i];
    const value = DATA_CHAR_TO_VALUE[char];
    if (value === undefined) {
      throw new Error(`Invalid data character: ${char}`);
    }
    dataBits = (dataBits << 6n) | BigInt(value);
  }

  // Extract TNID variant (bits 60-61 from the right of the 102-bit value)
  const tnidVariant = Number((dataBits >> 60n) & 0b11n);

  return { dataBits, tnidVariant };
}

function dataBitsToBytes(dataBits: bigint, nameBits: number): Uint8Array {
  // Reconstruct the full 128-bit value from 102 data bits
  // Data bits layout: payloadA(28) + payloadB(12) + tnid_var(2) + payloadC(60) = 102 bits
  //
  // 128-bit layout:
  //   name(20) + payloadA(28) + uuid_ver(4) + payloadB(12) + uuid_var(2) + tnid_var(2) + payloadC(60)

  // Extract from dataBits (102 bits total):
  const payloadA = (dataBits >> 74n) & ((1n << 28n) - 1n); // bits 74-101
  const payloadB = (dataBits >> 62n) & ((1n << 12n) - 1n); // bits 62-73
  const tnidVariant = (dataBits >> 60n) & 0b11n; // bits 60-61
  const payloadC = dataBits & ((1n << 60n) - 1n); // bits 0-59

  // Reconstruct 128-bit value
  let value = BigInt(nameBits);
  value = (value << 28n) | payloadA;
  value = (value << 4n) | 0x8n; // UUID version 8
  value = (value << 12n) | payloadB;
  value = (value << 2n) | 0b10n; // UUID variant
  value = (value << 2n) | tnidVariant;
  value = (value << 60n) | payloadC;

  // Convert to bytes
  const bytes = new Uint8Array(16);
  for (let i = 15; i >= 0; i--) {
    bytes[i] = Number(value & 0xffn);
    value >>= 8n;
  }

  return bytes;
}

// -----------------------------------------------------------------------------
// TNID Generation (Mask-based approach matching Rust implementation)
// -----------------------------------------------------------------------------

// Masks for UUID version 8 and variant bits
const UUID_V8_MASK = 0x00000000_0000_8000_8000_000000000000n;

// V1: 100 random bits scattered across the UUID
// Mask: 0x00000fff_ffff_0fff_0fff_ffffffffffff
const V1_RANDOM_MASK = 0x00000fff_ffff_0fff_0fff_ffffffffffffn;

// V0: 57 random bits in the lower portion
// Mask: 0x00000000_0000_0000_01ff_ffffffffffff
const V0_RANDOM_MASK = 0x00000000_0000_0000_01ff_ffffffffffffn;

// V0 timestamp masks (for extracting and placing 43-bit timestamp)
const TIMESTAMP_FIRST_28_MASK = 0x0000_07ff_ffff_8000n;
const TIMESTAMP_SECOND_12_MASK = 0x0000_0000_0000_7ff8n;
const TIMESTAMP_LAST_3_MASK = 0x0000_0000_0000_0007n;

/** Place name bits in their correct position (bits 108-127) */
function nameMask(nameBits: number): bigint {
  return BigInt(nameBits) << 108n;
}

/** Place UUID version/variant and TNID variant in their correct positions */
function uuidAndVariantMask(tnidVariant: bigint): bigint {
  return UUID_V8_MASK | ((tnidVariant & 0b11n) << 60n);
}

/** Scatter 43-bit timestamp into its three positions within the 128-bit ID */
function millisMask(millisSinceEpoch: bigint): bigint {
  let mask = 0n;

  // First 28 bits of timestamp → bits 80-107 of UUID
  const first28LeadingZeros = 64n - 43n; // = 21, so mask starts at bit 42
  mask |= (millisSinceEpoch & TIMESTAMP_FIRST_28_MASK) <<
    (first28LeadingZeros + 64n - 20n);

  // Middle 12 bits of timestamp → bits 64-75 of UUID (after version nibble)
  const second12LeadingZeros = 64n - 15n; // = 49
  mask |= (millisSinceEpoch & TIMESTAMP_SECOND_12_MASK) <<
    (second12LeadingZeros + 64n - 52n);

  // Last 3 bits of timestamp → bits 57-59 of UUID (after variant bits)
  const last3LeadingZeros = 64n - 3n; // = 61
  mask |= (millisSinceEpoch & TIMESTAMP_LAST_3_MASK) <<
    (last3LeadingZeros + 64n - 68n);

  return mask;
}

/** Build a 128-bit TNID value using mask-based OR operations */
function buildTnidValue(
  nameBits: number,
  payloadMask: bigint,
  tnidVariant: bigint,
): bigint {
  return nameMask(nameBits) | uuidAndVariantMask(tnidVariant) | payloadMask;
}

/** Convert 128-bit value to byte array */
function valueToBytes(value: bigint): Uint8Array {
  const bytes = new Uint8Array(16);
  let v = value;
  for (let i = 15; i >= 0; i--) {
    bytes[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return bytes;
}

function generateV0(
  nameBits: number,
  timestampMs?: bigint,
  randomBits?: bigint,
): Uint8Array {
  const timestamp = timestampMs !== undefined
    ? timestampMs & ((1n << 43n) - 1n)
    : BigInt(Date.now()) & ((1n << 43n) - 1n);

  let random: bigint;
  if (randomBits !== undefined) {
    random = randomBits;
  } else {
    const randomBytes = crypto.getRandomValues(new Uint8Array(8));
    random = 0n;
    for (const byte of randomBytes) {
      random = (random << 8n) | BigInt(byte);
    }
  }

  const payloadMask = millisMask(timestamp) | (random & V0_RANDOM_MASK);
  const value = buildTnidValue(nameBits, payloadMask, 0b00n);
  return valueToBytes(value);
}

function generateV1(nameBits: number, randomBits?: bigint): Uint8Array {
  let random: bigint;
  if (randomBits !== undefined) {
    random = randomBits;
  } else {
    const randomBytes = crypto.getRandomValues(new Uint8Array(16));
    random = 0n;
    for (const byte of randomBytes) {
      random = (random << 8n) | BigInt(byte);
    }
  }

  const payloadMask = random & V1_RANDOM_MASK;
  const value = buildTnidValue(nameBits, payloadMask, 0b01n);
  return valueToBytes(value);
}

// -----------------------------------------------------------------------------
// Runtime Name Validation
// -----------------------------------------------------------------------------

const VALID_NAME_CHARS = new Set("01234abcdefghijklmnopqrstuvwxyz".split(""));

function isValidNameRuntime(name: string): boolean {
  if (name.length < 1 || name.length > 4) return false;
  for (const char of name) {
    if (!VALID_NAME_CHARS.has(char)) return false;
  }
  return true;
}

// -----------------------------------------------------------------------------
// UUID String Conversion
// -----------------------------------------------------------------------------

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Convert a 128-bit value to UUID hex string format */
function valueToUuidString(value: bigint, upperCase: boolean = false): string {
  const hex = value.toString(16).padStart(32, "0");
  const uuid = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${
    hex.slice(16, 20)
  }-${hex.slice(20)}`;
  return upperCase ? uuid.toUpperCase() : uuid.toLowerCase();
}

/** Parse a UUID hex string to a 128-bit value */
function parseUuidStringToValue(uuid: string): bigint {
  if (!UUID_REGEX.test(uuid)) {
    throw new Error(`Invalid UUID format: ${uuid}`);
  }
  const hex = uuid.replace(/-/g, "");
  return BigInt("0x" + hex);
}

/** Extract name bits from a 128-bit TNID value */
function extractNameBitsFromValue(value: bigint): number {
  return Number((value >> 108n) & 0xfffffn);
}

/** Extract TNID variant from a 128-bit value */
function extractVariantFromValue(value: bigint): TnidVariant {
  const variantBits = Number((value >> 60n) & 0b11n);
  const variants: TnidVariant[] = ["v0", "v1", "v2", "v3"];
  return variants[variantBits];
}

/** Validate that a 128-bit value has correct UUIDv8 version and variant bits */
function validateUuidBits(value: bigint): boolean {
  // Check UUID version (bits 76-79 should be 0x8)
  const version = Number((value >> 76n) & 0xfn);
  if (version !== 8) return false;

  // Check UUID variant (bits 62-63 should be 0b10)
  const variant = Number((value >> 62n) & 0b11n);
  if (variant !== 0b10) return false;

  return true;
}

/** Convert bytes to TNID string */
function bytesToTnidString(bytes: Uint8Array, name: string): string {
  const dataEncoded = encodeData(bytes);
  return `${name}.${dataEncoded}`;
}

/** Convert 128-bit value to TNID string */
function valueToTnidString(value: bigint): string {
  const nameBits = extractNameBitsFromValue(value);
  const name = decodeName(nameBits);
  const bytes = valueToBytes(value);
  return bytesToTnidString(bytes, name);
}

// -----------------------------------------------------------------------------
// TNID Utility Functions
// -----------------------------------------------------------------------------

function getTnidVariantImpl(id: DynamicTnid): TnidVariant {
  const dotIndex = id.indexOf(".");
  if (dotIndex === -1) {
    throw new Error("Invalid TNID: missing separator");
  }
  const dataEncoded = id.substring(dotIndex + 1);
  const { tnidVariant } = decodeData(dataEncoded);
  const variants: TnidVariant[] = ["v0", "v1", "v2", "v3"];
  return variants[tnidVariant];
}

function getTnidNameImpl(id: DynamicTnid): string {
  const dotIndex = id.indexOf(".");
  if (dotIndex === -1) {
    throw new Error("Invalid TNID: missing separator");
  }
  return id.substring(0, dotIndex);
}

function getNameHexImpl(id: DynamicTnid): string {
  const name = getTnidNameImpl(id);
  const nameBits = encodeName(name);
  // Format as 5 hex characters (20 bits)
  return nameBits.toString(16).padStart(5, "0");
}

function toUuidStringImpl(id: DynamicTnid, upperCase: boolean = false): string {
  const dotIndex = id.indexOf(".");
  if (dotIndex === -1) {
    throw new Error("Invalid TNID: missing separator");
  }

  const name = id.substring(0, dotIndex);
  const dataEncoded = id.substring(dotIndex + 1);

  const nameBits = encodeName(name);
  const { dataBits } = decodeData(dataEncoded);
  const bytes = dataBitsToBytes(dataBits, nameBits);

  let value = 0n;
  for (const byte of bytes) {
    value = (value << 8n) | BigInt(byte);
  }

  return valueToUuidString(value, upperCase);
}

function parseDynamicTnidImpl(s: string): DynamicTnid {
  const dotIndex = s.indexOf(".");
  if (dotIndex === -1) {
    throw new Error("Invalid TNID string: missing '.' separator");
  }

  const name = s.substring(0, dotIndex);
  const dataEncoded = s.substring(dotIndex + 1);

  if (!isValidNameRuntime(name)) {
    throw new Error(`Invalid TNID name: "${name}"`);
  }

  // Validate data portion
  const nameBits = encodeName(name);
  const { dataBits } = decodeData(dataEncoded);

  // Verify we can reconstruct it (validates the encoding)
  const reconstructed = dataBitsToBytes(dataBits, nameBits);
  const reencoded = encodeData(reconstructed);

  if (reencoded !== dataEncoded) {
    throw new Error("Invalid TNID data encoding");
  }

  return s as DynamicTnid;
}

function parseDynamicUuidStringImpl(uuid: string): DynamicTnid {
  const value = parseUuidStringToValue(uuid);

  if (!validateUuidBits(value)) {
    throw new Error("Invalid TNID: not a valid UUIDv8");
  }

  const nameBits = extractNameBitsFromValue(value);
  const name = decodeName(nameBits);

  if (!isValidNameRuntime(name)) {
    throw new Error(`Invalid TNID: invalid name encoding`);
  }

  return valueToTnidString(value) as DynamicTnid;
}

// -----------------------------------------------------------------------------
// Main Factory Function
// -----------------------------------------------------------------------------

/**
 * Create a TNID factory for the given name.
 *
 * The name is validated at **compile time** - only 1-4 characters using `0-4` and `a-z`.
 * Invalid names will produce a TypeScript error.
 *
 * @example
 * ```ts
 * const UserId = Tnid("user");
 * type UserId = TnidType<typeof UserId>;
 *
 * const id = UserId.new_v0();        // Generate new ID
 * const parsed = UserId.parse(str);  // Parse existing ID
 * ```
 *
 * @example
 * ```ts
 * // These produce compile errors:
 * Tnid("users")  // Too long (max 4 chars)
 * Tnid("User")   // Uppercase not allowed
 * Tnid("a-b")    // Hyphen not allowed
 * Tnid("5")      // Only digits 0-4 allowed
 * ```
 */
export function Tnid<const Name extends string>(
  name: ValidateName<Name>,
): TnidFactory<Name> {
  // Runtime validation (belt and suspenders)
  if (!isValidNameRuntime(name)) {
    throw new Error(
      `Invalid TNID name: "${name}". Must be 1-4 characters of: 0-4, a-z`,
    );
  }

  const nameBits = encodeName(name);

  const factory: TnidFactory<Name> = {
    name: name as Name,

    new_v0(): TnidValue<Name> {
      const bytes = generateV0(nameBits);
      const dataEncoded = encodeData(bytes);
      return `${name}.${dataEncoded}` as TnidValue<Name>;
    },

    new_v1(): TnidValue<Name> {
      const bytes = generateV1(nameBits);
      const dataEncoded = encodeData(bytes);
      return `${name}.${dataEncoded}` as TnidValue<Name>;
    },

    v0_from_parts(timestampMs: bigint, randomBits: bigint): TnidValue<Name> {
      const bytes = generateV0(nameBits, timestampMs, randomBits);
      const dataEncoded = encodeData(bytes);
      return `${name}.${dataEncoded}` as TnidValue<Name>;
    },

    v1_from_parts(randomBits: bigint): TnidValue<Name> {
      const bytes = generateV1(nameBits, randomBits);
      const dataEncoded = encodeData(bytes);
      return `${name}.${dataEncoded}` as TnidValue<Name>;
    },

    parse(s: string): TnidValue<Name> {
      const dotIndex = s.indexOf(".");
      if (dotIndex === -1) {
        throw new Error(`Invalid TNID string: missing '.' separator`);
      }

      const parsedName = s.substring(0, dotIndex);
      const dataEncoded = s.substring(dotIndex + 1);

      if (parsedName !== name) {
        throw new Error(
          `TNID name mismatch: expected "${name}", got "${parsedName}"`,
        );
      }

      if (!isValidNameRuntime(parsedName)) {
        throw new Error(`Invalid TNID name in string: "${parsedName}"`);
      }

      // Validate data portion
      const { dataBits } = decodeData(dataEncoded);

      // Verify we can reconstruct it (validates the encoding)
      const reconstructed = dataBitsToBytes(dataBits, nameBits);
      const reencoded = encodeData(reconstructed);

      if (reencoded !== dataEncoded) {
        throw new Error(`Invalid TNID data encoding`);
      }

      return s as TnidValue<Name>;
    },

    parseUuidString(uuid: string): TnidValue<Name> {
      const value = parseUuidStringToValue(uuid);

      if (!validateUuidBits(value)) {
        throw new Error("Invalid TNID: not a valid UUIDv8");
      }

      const uuidNameBits = extractNameBitsFromValue(value);
      if (uuidNameBits !== nameBits) {
        const foundName = decodeName(uuidNameBits);
        throw new Error(
          `TNID name mismatch: expected "${name}", got "${foundName}"`,
        );
      }

      return valueToTnidString(value) as TnidValue<Name>;
    },

    nameHex(): string {
      return nameBits.toString(16).padStart(5, "0");
    },

    variant(id: TnidValue<Name>): TnidVariant {
      return getTnidVariantImpl(id as DynamicTnid);
    },

    toUuidString(id: TnidValue<Name>, caseFormat: Case = "lower"): string {
      return toUuidStringImpl(id as DynamicTnid, caseFormat === "upper");
    },
  };

  return factory;
}
