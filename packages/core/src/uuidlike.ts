// =============================================================================
// UuidLike - Wrapper for UUID hex strings
// =============================================================================

import type { DynamicTnid } from "./dynamic.ts";

/** A UUID hex string (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx) that may or may not be a valid TNID. */
export type UuidLike = string & { __uuidlike: true };
import { decodeName, isValidNameRuntime } from "./name_encoding.ts";
import {
  UUID_REGEX,
  parseUuidStringToValue,
  validateUuidBits,
  extractNameBitsFromValue,
  valueToTnidString,
} from "./uuid.ts";
import { toUuidStringImpl } from "./dynamic.ts";

/** Interface for UuidLike static methods. */
export interface UuidLikeNamespace {
  /** Create from a TNID (always valid). */
  fromTnid(id: DynamicTnid): UuidLike;
  /** Parse UUID hex string (format validation only, not TNID validation). */
  parse(s: string): UuidLike;
  /** Try to convert to DynamicTnid (validates TNID structure). */
  toTnid(uuid: UuidLike): DynamicTnid;
  /** Format as uppercase UUID hex string. */
  toUpperCase(uuid: UuidLike): UuidLike;
}

/** Wrapper for UUID hex strings that may or may not be valid TNIDs. */
export const UuidLike: UuidLikeNamespace = {
  fromTnid(id: DynamicTnid): UuidLike {
    return toUuidStringImpl(id, false) as UuidLike;
  },

  parse(s: string): UuidLike {
    // Validate format only
    if (!UUID_REGEX.test(s)) {
      throw new Error(`Invalid UUID format: ${s}`);
    }
    return s.toLowerCase() as UuidLike;
  },

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

  toUpperCase(uuid: UuidLike): UuidLike {
    return (uuid as string).toUpperCase() as UuidLike;
  },
};
