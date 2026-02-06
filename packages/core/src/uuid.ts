// =============================================================================
// UUID String Utilities
// =============================================================================

import type { TnidVariant } from "./types.ts";
import { decodeName } from "./name_encoding.ts";
import { encodeData } from "./data_encoding.ts";
import { valueToBytes } from "./bits.ts";

export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Convert a 128-bit value to UUID hex string format */
export function valueToUuidString(
  value: bigint,
  upperCase: boolean = false,
): string {
  const hex = value.toString(16).padStart(32, "0");
  const uuid = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${
    hex.slice(16, 20)
  }-${hex.slice(20)}`;
  return upperCase ? uuid.toUpperCase() : uuid.toLowerCase();
}

/** Parse a UUID hex string to a 128-bit value */
export function parseUuidStringToValue(uuid: string): bigint {
  if (!UUID_REGEX.test(uuid)) {
    throw new Error(`Invalid UUID format: ${uuid}`);
  }
  const hex = uuid.replace(/-/g, "");
  return BigInt("0x" + hex);
}

/** Extract name bits from a 128-bit TNID value */
export function extractNameBitsFromValue(value: bigint): number {
  return Number((value >> 108n) & 0xfffffn);
}

/** Extract TNID variant from a 128-bit value */
export function extractVariantFromValue(value: bigint): TnidVariant {
  const variantBits = Number((value >> 60n) & 0b11n);
  const variants: TnidVariant[] = ["v0", "v1", "v2", "v3"];
  return variants[variantBits];
}

/** Validate that a 128-bit value has correct UUIDv8 version and variant bits */
export function validateUuidBits(value: bigint): boolean {
  // Check UUID version (bits 76-79 should be 0x8)
  const version = Number((value >> 76n) & 0xfn);
  if (version !== 8) return false;

  // Check UUID variant (bits 62-63 should be 0b10)
  const variant = Number((value >> 62n) & 0b11n);
  if (variant !== 0b10) return false;

  return true;
}

/** Convert bytes to TNID string */
export function bytesToTnidString(bytes: Uint8Array, name: string): string {
  const dataEncoded = encodeData(bytes);
  return `${name}.${dataEncoded}`;
}

/** Convert 128-bit value to TNID string */
export function valueToTnidString(value: bigint): string {
  const nameBits = extractNameBitsFromValue(value);
  const name = decodeName(nameBits);
  if (name === null) {
    throw new Error("Invalid TNID: name bits are all zero");
  }
  const bytes = valueToBytes(value);
  return bytesToTnidString(bytes, name);
}
