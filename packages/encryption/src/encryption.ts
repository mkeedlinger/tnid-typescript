/**
 * TNID encryption using FF1 Format-Preserving Encryption.
 *
 * Provides functions to convert V0 (time-ordered) TNIDs to V1 (random-looking)
 * TNIDs and vice versa, hiding timestamp information while remaining reversible.
 */

import { DynamicTnid } from "@tnid/core";
import {
  parseUuidStringToValue,
  valueToTnidString,
  extractVariantFromValue,
} from "@tnid/core/uuid";

import { FF1 } from "./ff1.ts";
import {
  COMPLETE_SECRET_DATA_MASK,
  expandSecretDataBits,
  extractSecretDataBits,
  fromHexDigits,
  setVariant,
  toHexDigits,
} from "./bits.ts";

/**
 * Error when creating an EncryptionKey.
 */
export class EncryptionKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EncryptionKeyError";
  }
}

/**
 * Error when encrypting or decrypting a TNID.
 */
export class EncryptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EncryptionError";
  }
}

/**
 * A 128-bit (16 byte) encryption key for TNID encryption.
 */
export class EncryptionKey {
  private readonly bytes: Uint8Array;

  private constructor(bytes: Uint8Array) {
    this.bytes = bytes;
  }

  /**
   * Creates a new encryption key from raw bytes.
   */
  static fromBytes(bytes: Uint8Array): EncryptionKey {
    if (bytes.length !== 16) {
      throw new EncryptionKeyError(
        `Encryption key must be 16 bytes, got ${bytes.length}`,
      );
    }
    return new EncryptionKey(new Uint8Array(bytes));
  }

  /**
   * Creates an encryption key from a 32-character hex string.
   */
  static fromHex(hex: string): EncryptionKey {
    if (hex.length !== 32) {
      throw new EncryptionKeyError(
        `Encryption key hex string must be 32 characters, got ${hex.length}`,
      );
    }

    const bytes = new Uint8Array(16);
    for (let i = 0; i < 16; i++) {
      const hexByte = hex.slice(i * 2, i * 2 + 2);
      const value = parseInt(hexByte, 16);
      if (isNaN(value)) {
        throw new EncryptionKeyError(
          `Invalid hex character at position ${i * 2}`,
        );
      }
      bytes[i] = value;
    }

    return new EncryptionKey(bytes);
  }

  /**
   * Returns the key as a byte array.
   */
  asBytes(): Uint8Array {
    return new Uint8Array(this.bytes);
  }
}

/**
 * Convert TNID string to 128-bit value.
 */
function tnidToValue(tnid: string): bigint {
  // Use @tnid/core to convert to UUID, then parse UUID to value
  const parsed = DynamicTnid.parse(tnid);
  const uuid = DynamicTnid.toUuidString(parsed);
  return parseUuidStringToValue(uuid);
}

/**
 * Convert 128-bit value back to TNID string.
 */
function valueToTnid(value: bigint): string {
  return valueToTnidString(value);
}

/**
 * Encrypts the 100-bit Payload using FF1.
 */
async function encryptPayload(payload: bigint, key: EncryptionKey): Promise<bigint> {
  // Mask to 100 bits
  const mask = (1n << 100n) - 1n;
  const data = payload & mask;

  // Convert to hex digits
  const hexDigits = toHexDigits(data);

  // Create FF1 cipher with radix 16
  const ff1 = new FF1(key.asBytes(), 16);

  // Encrypt with empty tweak
  const encrypted = await ff1.encrypt(new Uint8Array(0), hexDigits);

  // Convert back to bigint
  return fromHexDigits(encrypted);
}

/**
 * Decrypts the 100-bit Payload using FF1.
 */
async function decryptPayload(payload: bigint, key: EncryptionKey): Promise<bigint> {
  // Mask to 100 bits
  const mask = (1n << 100n) - 1n;
  const data = payload & mask;

  // Convert to hex digits
  const hexDigits = toHexDigits(data);

  // Create FF1 cipher with radix 16
  const ff1 = new FF1(key.asBytes(), 16);

  // Decrypt with empty tweak
  const decrypted = await ff1.decrypt(new Uint8Array(0), hexDigits);

  // Convert back to bigint
  return fromHexDigits(decrypted);
}

/**
 * Encrypts a V0 TNID to V1, hiding timestamp information.
 *
 * @param tnid The V0 TNID string to encrypt
 * @param key The encryption key
 * @returns The encrypted V1 TNID string
 * @throws EncryptionError if the TNID is not V0 or is invalid
 */
export async function encryptV0ToV1(tnid: string, key: EncryptionKey): Promise<string> {
  let value: bigint;
  try {
    value = tnidToValue(tnid);
  } catch (e) {
    throw new EncryptionError(`Invalid TNID: ${(e as Error).message}`);
  }

  const variant = extractVariantFromValue(value);
  if (variant === "v1") {
    // Already V1, return unchanged
    return tnid;
  }
  if (variant !== "v0") {
    throw new EncryptionError(
      `TNID variant ${variant} is not supported for encryption`,
    );
  }

  // Extract the 100 Payload bits
  const secretData = extractSecretDataBits(value);

  // Encrypt the Payload
  const encryptedData = await encryptPayload(secretData, key);

  // Expand back to proper bit positions
  const expanded = expandSecretDataBits(encryptedData);

  // Preserve Name bits and UUID-specific bits, replace Payload bits
  let result = (value & ~COMPLETE_SECRET_DATA_MASK) | expanded;

  // Change variant from V0 to V1
  result = setVariant(result, "v1");

  return valueToTnid(result);
}

/**
 * Decrypts a V1 TNID back to V0, recovering timestamp information.
 *
 * @param tnid The V1 TNID string to decrypt
 * @param key The encryption key (must match the one used for encryption)
 * @returns The decrypted V0 TNID string
 * @throws EncryptionError if the TNID is not V1 or is invalid
 */
export async function decryptV1ToV0(tnid: string, key: EncryptionKey): Promise<string> {
  let value: bigint;
  try {
    value = tnidToValue(tnid);
  } catch (e) {
    throw new EncryptionError(`Invalid TNID: ${(e as Error).message}`);
  }

  const variant = extractVariantFromValue(value);
  if (variant === "v0") {
    // Already V0, return unchanged
    return tnid;
  }
  if (variant !== "v1") {
    throw new EncryptionError(
      `TNID variant ${variant} is not supported for decryption`,
    );
  }

  // Extract the 100 Payload bits
  const encryptedData = extractSecretDataBits(value);

  // Decrypt the Payload
  const decryptedData = await decryptPayload(encryptedData, key);

  // Expand back to proper bit positions
  const expanded = expandSecretDataBits(decryptedData);

  // Preserve Name bits and UUID-specific bits, replace Payload bits
  let result = (value & ~COMPLETE_SECRET_DATA_MASK) | expanded;

  // Change variant from V1 to V0
  result = setVariant(result, "v0");

  return valueToTnid(result);
}
