// =============================================================================
// DynamicTnid - Runtime name validation
// =============================================================================

import type { Case, TnidValue, TnidVariant } from "./types.ts";

/** A TNID that can hold any name. Use for generic functions. */
export type DynamicTnid = TnidValue<string>;
import { encodeName, decodeName, isValidNameRuntime } from "./name_encoding.ts";
import { encodeData, decodeData, dataBitsToBytes } from "./data_encoding.ts";
import { generateV0, generateV1 } from "./bits.ts";
import {
  parseUuidStringToValue,
  validateUuidBits,
  extractNameBitsFromValue,
  valueToTnidString,
  valueToUuidString,
} from "./uuid.ts";

// -----------------------------------------------------------------------------
// Internal Helper Functions
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
// DynamicTnid Namespace
// -----------------------------------------------------------------------------

/** Interface for DynamicTnid static methods. */
export interface DynamicTnidNamespace {
  /** Generate a new time-sortable TNID (variant 0) with runtime name validation. */
  newV0(name: string): DynamicTnid;
  /** Alias for newV0. */
  newTimeOrdered(name: string): DynamicTnid;
  /** Generate a new time-sortable TNID with a specific timestamp. */
  newV0WithTime(name: string, time: Date): DynamicTnid;
  /** Generate a new time-sortable TNID with explicit timestamp and random components. */
  newV0WithParts(name: string, epochMillis: bigint, random: bigint): DynamicTnid;
  /** Generate a new high-entropy TNID (variant 1) with runtime name validation. */
  newV1(name: string): DynamicTnid;
  /** Alias for newV1. */
  newHighEntropy(name: string): DynamicTnid;
  /** Generate a new high-entropy TNID with explicit random bits. */
  newV1WithRandom(name: string, randomBits: bigint): DynamicTnid;
  /** Parse a TNID from either TNID string format or UUID hex format (auto-detected). */
  parse(s: string): DynamicTnid;
  /** Parse a TNID string (e.g., "user.Br2flcNDfF6LYICnT"). */
  parseTnidString(s: string): DynamicTnid;
  /** Parse a UUID hex string into a DynamicTnid (validates TNID structure). */
  parseUuidString(uuid: string): DynamicTnid;
  /** Get the name from a TNID. */
  getName(id: DynamicTnid): string;
  /** Get the name encoded as a 5-character hex string. */
  getNameHex(id: DynamicTnid): string;
  /** Get the variant of a TNID. */
  getVariant(id: DynamicTnid): TnidVariant;
  /** Convert to UUID hex string format. */
  toUuidString(id: DynamicTnid, caseFormat?: Case): string;
}

/** Static methods for working with any TNID regardless of name. */
export const DynamicTnid: DynamicTnidNamespace = {
  /** Generate a new time-sortable TNID (variant 0) with runtime name validation. */
  newV0(name: string): DynamicTnid {
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

  /** Alias for newV0. */
  newTimeOrdered(name: string): DynamicTnid {
    return DynamicTnid.newV0(name);
  },

  /** Generate a new time-sortable TNID with a specific timestamp. */
  newV0WithTime(name: string, time: Date): DynamicTnid {
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
  newV0WithParts(
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
  newV1(name: string): DynamicTnid {
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

  /** Alias for newV1. */
  newHighEntropy(name: string): DynamicTnid {
    return DynamicTnid.newV1(name);
  },

  /** Generate a new high-entropy TNID with explicit random bits. */
  newV1WithRandom(name: string, randomBits: bigint): DynamicTnid {
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

  /** Parse a TNID from either TNID string format or UUID hex format (auto-detected). */
  parse(s: string): DynamicTnid {
    // Detect format by length: TNID strings are 19-22 chars with '.', UUIDs are 36 chars
    if (s.length >= 19 && s.length <= 22 && s.includes(".")) {
      return parseDynamicTnidImpl(s);
    } else if (s.length === 36) {
      return parseDynamicUuidStringImpl(s);
    } else {
      throw new Error(
        `Invalid TNID: expected TNID string (19-22 chars) or UUID (36 chars), got ${s.length} chars`,
      );
    }
  },

  /** Parse a TNID string (e.g., "user.Br2flcNDfF6LYICnT"). */
  parseTnidString(s: string): DynamicTnid {
    return parseDynamicTnidImpl(s);
  },

  /** Parse a UUID hex string into a DynamicTnid (validates TNID structure). */
  parseUuidString(uuid: string): DynamicTnid {
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
};

// Export helper functions for use by factory.ts
export {
  getTnidVariantImpl,
  toUuidStringImpl,
};
