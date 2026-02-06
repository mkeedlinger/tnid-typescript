/**
 * Tests for TNID encryption/decryption.
 */

import { assertEquals, assertThrows } from "@std/assert";
import { DynamicTnid } from "@tnid/core";
import {
  decryptV1ToV0,
  EncryptionKey,
  EncryptionKeyError,
  encryptV0ToV1,
} from "../src/index.ts";

// ============================================================================
// EncryptionKey Tests
// ============================================================================

Deno.test("EncryptionKey: fromBytes works", () => {
  const bytes = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
  const key = EncryptionKey.fromBytes(bytes);
  assertEquals(key.asBytes(), bytes);
});

Deno.test("EncryptionKey: fromBytes rejects wrong length", () => {
  try {
    EncryptionKey.fromBytes(new Uint8Array([1, 2, 3]));
    throw new Error("Should have thrown");
  } catch (e) {
    assertEquals(e instanceof EncryptionKeyError, true);
  }
});

Deno.test("EncryptionKey: fromHex works", () => {
  const key = EncryptionKey.fromHex("0102030405060708090a0b0c0d0e0f10");
  const expected = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
  assertEquals(key.asBytes(), expected);
});

Deno.test("EncryptionKey: fromHex is case insensitive", () => {
  const lower = EncryptionKey.fromHex("0102030405060708090a0b0c0d0e0f10");
  const upper = EncryptionKey.fromHex("0102030405060708090A0B0C0D0E0F10");
  assertEquals(lower.asBytes(), upper.asBytes());
});

Deno.test("EncryptionKey: fromHex rejects wrong length", () => {
  try {
    EncryptionKey.fromHex("0102");
    throw new Error("Should have thrown");
  } catch (e) {
    assertEquals(e instanceof EncryptionKeyError, true);
  }
});

Deno.test("EncryptionKey: fromHex rejects invalid hex", () => {
  try {
    EncryptionKey.fromHex("0102030405060708090a0b0c0d0e0fgg");
    throw new Error("Should have thrown");
  } catch (e) {
    assertEquals(e instanceof EncryptionKeyError, true);
  }
});

// ============================================================================
// Round-trip Tests (self-consistency)
// ============================================================================

Deno.test("encryption: V0 round-trip works", async () => {
  const key = EncryptionKey.fromHex("0102030405060708090a0b0c0d0e0f10");
  const v0 = DynamicTnid.parse("user.--Zmk4cF---------");

  const encrypted = await encryptV0ToV1(v0, key);
  // Encrypted should be different from original
  assertEquals(encrypted !== v0, true, "Encrypted should differ from original");

  // Encrypted should still have same name
  assertEquals(encrypted.startsWith("user."), true, "Name should be preserved");

  const decrypted = await decryptV1ToV0(encrypted, key);
  assertEquals(decrypted, v0, "Decryption should recover original");
});

Deno.test("encryption: different keys produce different results", async () => {
  const key1 = EncryptionKey.fromHex("0102030405060708090a0b0c0d0e0f10");
  const key2 = EncryptionKey.fromHex("0102030405060708090a0b0c0d0e0f11");
  const v0 = DynamicTnid.parse("user.--Zmk4cF---------");

  const e1 = await encryptV0ToV1(v0, key1);
  const e2 = await encryptV0ToV1(v0, key2);

  assertEquals(e1 !== e2, true, "Different keys should produce different ciphertexts");
});

Deno.test("encryption: encrypting V1 returns it unchanged", async () => {
  const key = EncryptionKey.fromHex("0102030405060708090a0b0c0d0e0f10");
  const v0 = DynamicTnid.parse("user.--Zmk4cF---------");

  const v1 = await encryptV0ToV1(v0, key);
  const v1Again = await encryptV0ToV1(v1, key);

  assertEquals(v1, v1Again, "Encrypting V1 should return unchanged");
});

Deno.test("encryption: decrypting V0 returns it unchanged", async () => {
  const key = EncryptionKey.fromHex("0102030405060708090a0b0c0d0e0f10");
  const v0 = DynamicTnid.parse("user.--Zmk4cF---------");

  const v0Again = await decryptV1ToV0(v0, key);
  assertEquals(v0, v0Again, "Decrypting V0 should return unchanged");
});

// ============================================================================
// Rust Compatibility Test Vectors
// ============================================================================

// These test vectors were generated using the Rust tnid-cli tool.
// If these fail, it means we're not bit-compatible with Rust.

Deno.test("encryption: matches Rust - vector 1", async () => {
  // V0: user.--Zmk4cF--------- (timestamp=1234567890, random=0)
  // Key: 0102030405060708090a0b0c0d0e0f10
  // Rust encrypted: user.S1PcM9daFtzp1lJM5
  const key = EncryptionKey.fromHex("0102030405060708090a0b0c0d0e0f10");
  const v0 = DynamicTnid.parse("user.--Zmk4cF---------");
  const expectedEncrypted = "user.S1PcM9daFtzp1lJM5";

  const encrypted = await encryptV0ToV1(v0, key);
  assertEquals(encrypted, expectedEncrypted, "Should match Rust encrypted value");

  const decrypted = await decryptV1ToV0(encrypted, key);
  assertEquals(decrypted, v0, "Should decrypt back to original");
});

Deno.test("encryption: matches Rust - vector 2", async () => {
  // V0: post.7kbDJzwxJeNnf6kfH (timestamp=9999999999999, random=12345678901234567890)
  // Key: 2b7e151628aed2a6abf7158809cf4f3c (NIST test key)
  // Rust encrypted: post.X3Wxwp0wOy4OZp_rP
  const key = EncryptionKey.fromHex("2b7e151628aed2a6abf7158809cf4f3c");
  const v0 = DynamicTnid.parse("post.7kbDJzwxJeNnf6kfH");
  const expectedEncrypted = "post.X3Wxwp0wOy4OZp_rP";

  const encrypted = await encryptV0ToV1(v0, key);
  assertEquals(encrypted, expectedEncrypted, "Should match Rust encrypted value");

  const decrypted = await decryptV1ToV0(encrypted, key);
  assertEquals(decrypted, v0, "Should decrypt back to original");
});

Deno.test("encryption: matches Rust - vector 3", async () => {
  // V0: a.----------------- (timestamp=0, random=0)
  // Key: 00000000000000000000000000000000 (all zeros)
  // Rust encrypted: a.qjrH3l_XfqYmAVUgO
  const key = EncryptionKey.fromHex("00000000000000000000000000000000");
  const v0 = DynamicTnid.parse("a.-----------------");
  const expectedEncrypted = "a.qjrH3l_XfqYmAVUgO";

  const encrypted = await encryptV0ToV1(v0, key);
  assertEquals(encrypted, expectedEncrypted, "Should match Rust encrypted value");

  const decrypted = await decryptV1ToV0(encrypted, key);
  assertEquals(decrypted, v0, "Should decrypt back to original");
});

// ============================================================================
// Error Cases
// ============================================================================

Deno.test("encryption: DynamicTnid.parse rejects invalid format", () => {
  // parse() auto-detects format: no dot = tries UUID, fails on format
  assertThrows(
    () => DynamicTnid.parse("invalid"),
    Error,
    "Invalid TNID",
  );
});
