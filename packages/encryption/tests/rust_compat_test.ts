/**
 * Rust CLI conformity tests for encryption.
 *
 * These tests verify that our TypeScript encryption produces
 * bit-for-bit identical results to the Rust implementation.
 */

import { assertEquals } from "@std/assert";
import { Tnid } from "@tnid/core";
import { EncryptionKey, encryptV0ToV1, decryptV1ToV0 } from "../src/index.ts";
import * as path from "@std/path";

// Resolve CLI path relative to this file
const CLI_PATH = path.join(import.meta.dirname!, "../../../tnid-cli");

async function runCli(args: string[]): Promise<string> {
  const command = new Deno.Command(CLI_PATH, { args, stdout: "piped", stderr: "piped" });
  const { code, stdout, stderr } = await command.output();
  if (code !== 0) {
    throw new Error(`CLI failed: ${new TextDecoder().decode(stderr)}`);
  }
  return new TextDecoder().decode(stdout).trim();
}

/** Encrypt using the Rust CLI */
function cliEncrypt(tnid: string, keyHex: string): Promise<string> {
  return runCli(["encrypt", "-p", tnid, keyHex]);
}

/** Decrypt using the Rust CLI */
function cliDecrypt(tnid: string, keyHex: string): Promise<string> {
  return runCli(["decrypt", "-p", tnid, keyHex]);
}

// =============================================================================
// Test Keys
// =============================================================================

const TEST_KEYS = [
  "0102030405060708090a0b0c0d0e0f10", // Simple sequential
  "2b7e151628aed2a6abf7158809cf4f3c", // NIST test key
  "00000000000000000000000000000000", // All zeros
  "ffffffffffffffffffffffffffffffff", // All ones
];

// =============================================================================
// Encryption Conformity Tests
// =============================================================================

Deno.test("rust compat: encrypt V0 matches Rust CLI", async () => {
  const User = Tnid("user");
  const Post = Tnid("post");

  // Test various V0 TNIDs with different keys
  const testCases = [
    { tnid: User.v0_from_parts(1234567890n, 0n), keyHex: TEST_KEYS[0] },
    { tnid: User.v0_from_parts(9999999999999n, 12345678901234567890n), keyHex: TEST_KEYS[1] },
    { tnid: Post.v0_from_parts(0n, 0n), keyHex: TEST_KEYS[2] },
    { tnid: User.v0_from_parts(8796093022207n, (1n << 57n) - 1n), keyHex: TEST_KEYS[3] },
  ];

  for (const { tnid, keyHex } of testCases) {
    const key = EncryptionKey.fromHex(keyHex);

    const tsEncrypted = await encryptV0ToV1(tnid, key);
    const rustEncrypted = await cliEncrypt(tnid, keyHex);

    assertEquals(
      tsEncrypted,
      rustEncrypted,
      `Encryption mismatch for ${tnid} with key ${keyHex}\nTS:   ${tsEncrypted}\nRust: ${rustEncrypted}`
    );
  }
});

Deno.test("rust compat: decrypt V1 matches Rust CLI", async () => {
  const User = Tnid("user");

  // First encrypt some V0 TNIDs, then verify decryption matches
  const testCases = [
    { v0: User.v0_from_parts(1234567890n, 0n), keyHex: TEST_KEYS[0] },
    { v0: User.v0_from_parts(5555555555555n, 9876543210n), keyHex: TEST_KEYS[1] },
  ];

  for (const { v0, keyHex } of testCases) {
    const key = EncryptionKey.fromHex(keyHex);

    // Get V1 from Rust CLI
    const v1 = await cliEncrypt(v0, keyHex);

    // Decrypt with both implementations
    const tsDecrypted = await decryptV1ToV0(v1, key);
    const rustDecrypted = await cliDecrypt(v1, keyHex);

    assertEquals(
      tsDecrypted,
      rustDecrypted,
      `Decryption mismatch for ${v1} with key ${keyHex}\nTS:   ${tsDecrypted}\nRust: ${rustDecrypted}`
    );

    // Both should recover original V0
    assertEquals(tsDecrypted, v0, `TS decryption didn't recover original V0`);
  }
});

Deno.test("rust compat: round-trip encrypt/decrypt matches Rust", async () => {
  const names = ["user", "post", "a", "0", "test"];

  for (const name of names) {
    const Factory = Tnid(name as Parameters<typeof Tnid>[0]);
    const keyHex = TEST_KEYS[0];
    const key = EncryptionKey.fromHex(keyHex);

    // Generate random V0
    const v0 = Factory.new_v0();

    // Encrypt with TS
    const tsV1 = await encryptV0ToV1(v0, key);

    // Encrypt with Rust
    const rustV1 = await cliEncrypt(v0, keyHex);

    assertEquals(tsV1, rustV1, `Encrypt mismatch for name="${name}"`);

    // Decrypt with TS
    const tsDecrypted = await decryptV1ToV0(tsV1, key);

    // Decrypt with Rust
    const rustDecrypted = await cliDecrypt(rustV1, keyHex);

    assertEquals(tsDecrypted, rustDecrypted, `Decrypt mismatch for name="${name}"`);
    assertEquals(tsDecrypted, v0, `Round-trip failed for name="${name}"`);
  }
});

Deno.test("rust compat: V1 passthrough matches Rust", async () => {
  const User = Tnid("user");
  const keyHex = TEST_KEYS[0];
  const key = EncryptionKey.fromHex(keyHex);

  // Create a V1 TNID
  const v1 = User.new_v1();

  // Encrypting V1 should return it unchanged (with -p flag in Rust)
  const tsResult = await encryptV0ToV1(v1, key);
  const rustResult = await cliEncrypt(v1, keyHex);

  assertEquals(tsResult, v1, "TS should pass through V1 unchanged");
  assertEquals(rustResult, v1, "Rust should pass through V1 unchanged");
  assertEquals(tsResult, rustResult, "Passthrough results should match");
});

Deno.test("rust compat: V0 passthrough on decrypt matches Rust", async () => {
  const User = Tnid("user");
  const keyHex = TEST_KEYS[0];
  const key = EncryptionKey.fromHex(keyHex);

  // Create a V0 TNID
  const v0 = User.new_v0();

  // Decrypting V0 should return it unchanged (with -p flag in Rust)
  const tsResult = await decryptV1ToV0(v0, key);
  const rustResult = await cliDecrypt(v0, keyHex);

  assertEquals(tsResult, v0, "TS should pass through V0 unchanged");
  assertEquals(rustResult, v0, "Rust should pass through V0 unchanged");
  assertEquals(tsResult, rustResult, "Passthrough results should match");
});

Deno.test("rust compat: random V0 TNIDs encrypt identically", async () => {
  const iterations = 20;
  const keyHex = TEST_KEYS[1];
  const key = EncryptionKey.fromHex(keyHex);

  for (let i = 0; i < iterations; i++) {
    // Generate random name
    const chars = "01234abcdefghijklmnopqrstuvwxyz";
    const len = 1 + Math.floor(Math.random() * 4);
    let name = "";
    for (let j = 0; j < len; j++) {
      name += chars[Math.floor(Math.random() * chars.length)];
    }

    const Factory = Tnid(name as Parameters<typeof Tnid>[0]);
    const v0 = Factory.new_v0();

    const tsEncrypted = await encryptV0ToV1(v0, key);
    const rustEncrypted = await cliEncrypt(v0, keyHex);

    assertEquals(
      tsEncrypted,
      rustEncrypted,
      `Random test #${i} failed: name="${name}" v0=${v0}`
    );
  }
});
