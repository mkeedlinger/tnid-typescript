/**
 * TNID Encryption Example
 * Run with: deno run packages/encryption/examples/basic.ts
 */

import { Tnid, type TnidType } from "@tnid/core";
import {
  EncryptionKey,
  encryptV0ToV1,
  decryptV1ToV0,
} from "../src/index.ts";

// =============================================================================
// Setup
// =============================================================================

const UserId = Tnid("user");
type UserId = TnidType<typeof UserId>;

// Create an encryption key (16 bytes / 128 bits as hex)
const key = EncryptionKey.fromHex("0102030405060708090a0b0c0d0e0f10");

// =============================================================================
// Basic Encryption / Decryption
// =============================================================================

console.log("Basic Encryption:");

// Generate a time-ordered V0 ID
const v0: UserId = UserId.new_v0();
console.log(`  Original V0:  ${v0}`);
console.log(`  Variant:      ${UserId.variant(v0)}`);

// Encrypt to V1 (hides timestamp, looks random)
const v1 = await encryptV0ToV1(v0, key);
console.log(`  Encrypted V1: ${v1}`);

// Decrypt back to V0 (recovers timestamp)
const decrypted = await decryptV1ToV0(v1, key);
console.log(`  Decrypted:    ${decrypted}`);
console.log(`  Round-trip:   ${decrypted === v0 ? "OK" : "FAILED"}`);

// =============================================================================
// Passthrough Behavior
// =============================================================================

console.log("\nPassthrough Behavior:");

// Encrypting V1 returns it unchanged
const alreadyV1 = UserId.new_v1();
const stillV1 = await encryptV0ToV1(alreadyV1, key);
console.log(`  V1 input:     ${alreadyV1}`);
console.log(`  After encrypt:${stillV1}`);
console.log(`  Unchanged:    ${alreadyV1 === stillV1 ? "Yes" : "No"}`);

// Decrypting V0 returns it unchanged
const alreadyV0 = UserId.new_v0();
const stillV0 = await decryptV1ToV0(alreadyV0, key);
console.log(`  V0 input:     ${alreadyV0}`);
console.log(`  After decrypt:${stillV0}`);
console.log(`  Unchanged:    ${alreadyV0 === stillV0 ? "Yes" : "No"}`);

// =============================================================================
// Different Keys = Different Results
// =============================================================================

console.log("\nDifferent Keys:");

const key1 = EncryptionKey.fromHex("0102030405060708090a0b0c0d0e0f10");
const key2 = EncryptionKey.fromHex("ffffffffffffffffffffffffffffffff");

const original = UserId.new_v0();
const enc1 = await encryptV0ToV1(original, key1);
const enc2 = await encryptV0ToV1(original, key2);

console.log(`  Original:     ${original}`);
console.log(`  With key1:    ${enc1}`);
console.log(`  With key2:    ${enc2}`);
console.log(`  Different:    ${enc1 !== enc2 ? "Yes" : "No"}`);

// =============================================================================
// Key Management
// =============================================================================

console.log("\nKey Management:");

// From hex string
const fromHex = EncryptionKey.fromHex("00112233445566778899aabbccddeeff");
console.log(`  From hex:     ${fromHex.asBytes().length} bytes`);

// From raw bytes
const bytes = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
const fromBytes = EncryptionKey.fromBytes(bytes);
console.log(`  From bytes:   ${fromBytes.asBytes().length} bytes`);

// Generate a random key
const randomBytes = new Uint8Array(16);
crypto.getRandomValues(randomBytes);
const randomKey = EncryptionKey.fromBytes(randomBytes);
console.log(`  Random key:   ${Array.from(randomKey.asBytes()).map(b => b.toString(16).padStart(2, "0")).join("")}`);
