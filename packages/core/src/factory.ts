// =============================================================================
// Tnid Function
// =============================================================================

import type {
  Case,
  NamedTnid,
  TnidValue,
  TnidVariant,
  ValidateName,
} from "./types.ts";
import type { DynamicTnid } from "./dynamic.ts";
import {
  decodeName,
  encodeName,
  isValidNameRuntime,
  NAME_MAX_CHARS,
  NAME_MIN_CHARS,
} from "./name_encoding.ts";
import {
  DATA_CHAR_ENCODING_LEN,
  dataBitsToBytes,
  decodeData,
  encodeData,
} from "./data_encoding.ts";
import { generateV0, generateV1 } from "./bits.ts";
import {
  extractNameBitsFromValue,
  parseUuidStringToValue,
  validateUuidBits,
  valueToTnidString,
} from "./uuid.ts";
import { getTnidVariantImpl, toUuidStringImpl } from "./dynamic.ts";

const MIN_TNID_LEN = NAME_MIN_CHARS + 1 + DATA_CHAR_ENCODING_LEN;
const MAX_TNID_LEN = NAME_MAX_CHARS + 1 + DATA_CHAR_ENCODING_LEN;
const UUID_LEN = 36;

/**
 * Create a NamedTnid for the given name.
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
): NamedTnid<Name> {
  // Runtime validation (belt and suspenders)
  if (!isValidNameRuntime(name)) {
    throw new Error(
      `Invalid TNID name: "${name}". Must be 1-4 characters of: 0-4, a-z`,
    );
  }

  const nameBits = encodeName(name);

  const tnid: NamedTnid<Name> = {
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
      if (
        s.length >= MIN_TNID_LEN && s.length <= MAX_TNID_LEN && s.includes(".")
      ) {
        return tnid.parseTnidString(s);
      } else if (s.length >= MIN_TNID_LEN && s.length <= MAX_TNID_LEN) {
        throw new Error(`Invalid TNID string: missing '.' separator`);
      } else if (s.length === UUID_LEN) {
        return tnid.parseUuidString(s);
      } else {
        throw new Error(
          `Invalid TNID: expected TNID string (${MIN_TNID_LEN}-${MAX_TNID_LEN} chars) or UUID (${UUID_LEN} chars), got ${s.length} chars`,
        );
      }
    },

    parseTnidString(s: string): TnidValue<Name> {
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
        if (foundName === null) {
          throw new Error(
            `TNID name mismatch: expected "${name}", got invalid name bits 0x${
              uuidNameBits.toString(16).padStart(5, "0")
            }`,
          );
        }
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

  return tnid;
}
