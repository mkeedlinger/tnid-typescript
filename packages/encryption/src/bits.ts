/**
 * Bit manipulation for TNID encryption.
 *
 * These functions extract and expand the 100 Payload bits that are
 * encrypted/decrypted, matching the Rust implementation exactly.
 */

// Mask for the right-most Payload bits section (bits 0-59, 60 bits)
export const RIGHT_SECRET_DATA_SECTION_MASK =
  0x00000000_0000_0000_0fff_ffffffffffffn;

// Mask for the middle Payload bits section (bits 64-75, 12 bits)
export const MIDDLE_SECRET_DATA_SECTION_MASK =
  0x00000000_0000_0fff_0000_000000000000n;

// Mask for the left-most Payload bits section (bits 80-107, 28 bits)
export const LEFT_SECRET_DATA_SECTION_MASK =
  0x00000fff_ffff_0000_0000_000000000000n;

// Complete mask for all Payload bits (100 bits)
export const COMPLETE_SECRET_DATA_MASK = RIGHT_SECRET_DATA_SECTION_MASK |
  MIDDLE_SECRET_DATA_SECTION_MASK |
  LEFT_SECRET_DATA_SECTION_MASK;

// Number of Payload bits
export const SECRET_DATA_BIT_NUM = 100;

// Number of hex digits for FF1 (100 bits / 4 bits per hex digit)
export const HEX_DIGIT_COUNT = 25;

/**
 * Extracts Payload bits (excludes Name bits, UUID-specific bits, and TNID Variant bits).
 *
 * Compacts the Payload bits from the three sections into a single 100-bit value.
 * The returned bigint will have its lowest 100 bits populated with data,
 * and the highest bits set to zero.
 */
export function extractSecretDataBits(id: bigint): bigint {
  // Right section stays in place
  let extracted = id & RIGHT_SECRET_DATA_SECTION_MASK;

  // Middle section: shift right by 4 to compact
  const BETWEEN_MIDDLE_RIGHT = 4n;
  extracted = extracted |
    ((id & MIDDLE_SECRET_DATA_SECTION_MASK) >> BETWEEN_MIDDLE_RIGHT);

  // Left section: shift right by 8 to compact
  const BETWEEN_LEFT_MIDDLE = BETWEEN_MIDDLE_RIGHT + 4n;
  extracted = extracted |
    ((id & LEFT_SECRET_DATA_SECTION_MASK) >> BETWEEN_LEFT_MIDDLE);

  return extracted;
}

/**
 * Expands compacted Payload bits back into their positions.
 *
 * This is the inverse of extractSecretDataBits.
 * `bits` should have its lowest 100 bits populated with Payload data.
 */
export function expandSecretDataBits(bits: bigint): bigint {
  // Right section stays in place
  let expanded = bits & RIGHT_SECRET_DATA_SECTION_MASK;

  // Middle section shifts left
  const BETWEEN_MIDDLE_RIGHT = 4n;
  const middleMask = MIDDLE_SECRET_DATA_SECTION_MASK >> BETWEEN_MIDDLE_RIGHT;
  expanded = expanded | ((bits & middleMask) << BETWEEN_MIDDLE_RIGHT);

  // Left section shifts left
  const BETWEEN_LEFT_MIDDLE = BETWEEN_MIDDLE_RIGHT + 4n;
  const leftMask = LEFT_SECRET_DATA_SECTION_MASK >> BETWEEN_LEFT_MIDDLE;
  expanded = expanded | ((bits & leftMask) << BETWEEN_LEFT_MIDDLE);

  return expanded;
}

/**
 * Convert 100-bit value to 25 hex digits (each 0-15).
 * Most significant digit first.
 */
export function toHexDigits(data: bigint): number[] {
  const hexDigits: number[] = new Array(HEX_DIGIT_COUNT);
  for (let i = 0; i < HEX_DIGIT_COUNT; i++) {
    const shift = BigInt((HEX_DIGIT_COUNT - 1 - i) * 4);
    hexDigits[i] = Number((data >> shift) & 0xfn);
  }
  return hexDigits;
}

/**
 * Convert 25 hex digits back to 100-bit value.
 */
export function fromHexDigits(digits: number[]): bigint {
  let result = 0n;
  for (const digit of digits) {
    result = (result << 4n) | BigInt(digit);
  }
  return result;
}

// Variant bit positions (bits 60-61 in the 128-bit TNID)
const VARIANT_MASK = 0b11n << 60n;
const V0_VARIANT = 0b00n << 60n;
const V1_VARIANT = 0b01n << 60n;

/**
 * Get the TNID variant from a 128-bit ID value.
 */
export function getVariant(id: bigint): "v0" | "v1" | "v2" | "v3" {
  const variantBits = (id >> 60n) & 0b11n;
  switch (variantBits) {
    case 0b00n:
      return "v0";
    case 0b01n:
      return "v1";
    case 0b10n:
      return "v2";
    case 0b11n:
      return "v3";
    default:
      throw new Error("Unreachable");
  }
}

/**
 * Change the variant bits in a 128-bit ID.
 */
export function setVariant(id: bigint, variant: "v0" | "v1"): bigint {
  const cleared = id & ~VARIANT_MASK;
  const variantBits = variant === "v0" ? V0_VARIANT : V1_VARIANT;
  return cleared | variantBits;
}
