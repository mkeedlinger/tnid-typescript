import { assertEquals, assertRejects } from "@std/assert";
import { Tnid } from "@tnid/core";
import { EncryptionKey, encryptV0ToV1 } from "@tnid/encryption";
import { Blocklist, FilterError } from "../src/index.ts";
import { newV0FilteredForEncryption } from "../src/filter_encryption.ts";

const UserId = Tnid("user");
const key = EncryptionKey.fromHex("0102030405060708090a0b0c0d0e0f10");

// ============================================================================
// newV0FilteredForEncryption
// ============================================================================

Deno.test("newV0FilteredForEncryption: generates valid V0 TNID", async () => {
  const blocklist = new Blocklist(["TACO"]);
  const id = await newV0FilteredForEncryption(UserId, blocklist, key);
  assertEquals(id.startsWith("user."), true);
  assertEquals(UserId.variant(id), "v0");
});

Deno.test("newV0FilteredForEncryption: both V0 and V1 are clean", async () => {
  const blocklist = new Blocklist(["TACO", "FOO", "BAZZ"]);
  for (let i = 0; i < 20; i++) {
    const v0 = await newV0FilteredForEncryption(UserId, blocklist, key);
    const v0Data = v0.substring(v0.indexOf(".") + 1).toUpperCase();

    const v1 = await encryptV0ToV1(v0, key);
    const v1Data = v1.substring(v1.indexOf(".") + 1).toUpperCase();

    assertEquals(v0Data.includes("TACO"), false, `V0 ${v0} contains TACO`);
    assertEquals(v0Data.includes("FOO"), false, `V0 ${v0} contains FOO`);
    assertEquals(v0Data.includes("BAZZ"), false, `V0 ${v0} contains BAZZ`);
    assertEquals(v1Data.includes("TACO"), false, `V1 ${v1} contains TACO`);
    assertEquals(v1Data.includes("FOO"), false, `V1 ${v1} contains FOO`);
    assertEquals(v1Data.includes("BAZZ"), false, `V1 ${v1} contains BAZZ`);
  }
});

Deno.test("newV0FilteredForEncryption: empty blocklist always succeeds", async () => {
  const blocklist = new Blocklist([]);
  const id = await newV0FilteredForEncryption(UserId, blocklist, key);
  assertEquals(id.startsWith("user."), true);
});

Deno.test("newV0FilteredForEncryption: throws FilterError with extremely restrictive blocklist", async () => {
  const allChars =
    "-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_".split(
      "",
    );
  const blocklist = new Blocklist(allChars);

  await assertRejects(
    () => newV0FilteredForEncryption(UserId, blocklist, key),
    FilterError,
  );
});
