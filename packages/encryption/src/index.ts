/**
 * @tnid/encryption - Format-preserving encryption for TNIDs
 *
 * Provides FF1 (NIST SP 800-38G) encryption to convert time-ordered V0 TNIDs
 * to random-looking V1 TNIDs, hiding timestamp information while remaining
 * reversible with the secret key.
 *
 * @example
 * ```typescript
 * import { EncryptionKey, encryptV0ToV1, decryptV1ToV0 } from "@tnid/encryption";
 *
 * // Create a key from hex string
 * const key = EncryptionKey.fromHex("0102030405060708090a0b0c0d0e0f10");
 *
 * // Encrypt a V0 TNID to V1
 * const encrypted = await encryptV0ToV1("user.Br2flcNDfF6LYICnT", key);
 * // Returns a V1 TNID that looks random
 *
 * // Decrypt back to V0
 * const decrypted = await decryptV1ToV0(encrypted, key);
 * // decrypted === "user.Br2flcNDfF6LYICnT"
 * ```
 *
 * @module
 */

export {
  decryptV1ToV0,
  EncryptionError,
  EncryptionKey,
  EncryptionKeyError,
  encryptV0ToV1,
} from "./encryption.ts";
