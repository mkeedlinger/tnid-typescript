import { assertEquals, assertNotEquals, assertThrows } from "@std/assert";
import { DynamicTnid, Tnid, UuidLike } from "../src/index.ts";

// =============================================================================
// Generation Tests
// =============================================================================

Deno.test("tnid: new_v0 generates valid TNID strings", () => {
  const UserId = Tnid("user");
  const id = UserId.new_v0();

  const parts = id.split(".");
  assertEquals(parts.length, 2);
  assertEquals(parts[0], "user");
  assertEquals(parts[1].length, 17);
});

Deno.test("tnid: new_v0 generates unique IDs", () => {
  const UserId = Tnid("user");
  const id1 = UserId.new_v0();
  const id2 = UserId.new_v0();
  const id3 = UserId.new_v0();

  assertNotEquals(id1, id2);
  assertNotEquals(id2, id3);
  assertNotEquals(id1, id3);
});

Deno.test("tnid: generated IDs are valid strings", () => {
  const UserId = Tnid("user");
  const id = UserId.new_v0();

  assertEquals(typeof id, "string");
  assertEquals(id.startsWith("user."), true);
});

Deno.test("tnid: v0_from_parts produces v0 variant", () => {
  const UserId = Tnid("user");
  const id = UserId.v0_from_parts(1000n, 12345n);

  assertEquals(DynamicTnid.getVariant(id), "v0");
});

Deno.test("tnid: v1_from_parts produces v1 variant", () => {
  const UserId = Tnid("user");
  const id = UserId.v1_from_parts(12345n);

  assertEquals(DynamicTnid.getVariant(id), "v1");
});

// =============================================================================
// Parsing Tests
// =============================================================================

Deno.test("tnid: parse accepts valid TNID strings", () => {
  const UserId = Tnid("user");

  const original = UserId.new_v0();
  const parsed = UserId.parse(original);

  assertEquals(parsed, original);
});

Deno.test("tnid: parse rejects wrong name", () => {
  const UserId = Tnid("user");
  const PostId = Tnid("post");

  const postId = PostId.new_v0();

  assertThrows(
    () => UserId.parse(postId),
    Error,
    'name mismatch: expected "user", got "post"',
  );
});

Deno.test("tnid: parse rejects wrong length", () => {
  const UserId = Tnid("user");

  // Wrong length - rejected before format detection
  assertThrows(
    () => UserId.parse("usersomedata"),
    Error,
    "expected TNID string (19-22 chars) or UUID (36 chars)",
  );
});

Deno.test("tnid: parseTnidString rejects missing separator", () => {
  const UserId = Tnid("user");

  assertThrows(
    () => UserId.parseTnidString("usersomedata"),
    Error,
    "missing '.' separator",
  );
});

Deno.test("tnid: parseTnidString rejects invalid data length", () => {
  const UserId = Tnid("user");

  assertThrows(
    () => UserId.parseTnidString("user.tooshort"),
    Error,
    "Invalid data length",
  );
});

Deno.test("tnid: parse rejects invalid data characters", () => {
  const UserId = Tnid("user");

  assertThrows(
    () => UserId.parse("user.!!!!!!!!!!!!!!!!!"),
    Error,
    "Invalid data character",
  );
});

// =============================================================================
// Round-trip Tests
// =============================================================================

Deno.test("tnid: round-trip encoding is stable", () => {
  const UserId = Tnid("user");

  for (let i = 0; i < 10; i++) {
    const original = UserId.new_v0();
    const parsed = UserId.parse(original);
    assertEquals(parsed, original);
  }
});

Deno.test("tnid: different names produce different prefixes", () => {
  const A = Tnid("a");
  const B = Tnid("b");
  const User = Tnid("user");
  const Test = Tnid("test");

  assertEquals(A.new_v0().startsWith("a."), true);
  assertEquals(B.new_v0().startsWith("b."), true);
  assertEquals(User.new_v0().startsWith("user."), true);
  assertEquals(Test.new_v0().startsWith("test."), true);
});

// =============================================================================
// Name Encoding Edge Cases
// =============================================================================

Deno.test("tnid: single char names work", () => {
  const A = Tnid("a");
  const id = A.new_v0();
  assertEquals(id.startsWith("a."), true);
  const parsed = A.parse(id);
  assertEquals(parsed, id);
});

Deno.test("tnid: numeric names work", () => {
  const Zero = Tnid("0");
  const Mixed = Tnid("a1b2");

  const id0 = Zero.new_v0();
  const idMixed = Mixed.new_v0();

  assertEquals(id0.startsWith("0."), true);
  assertEquals(idMixed.startsWith("a1b2."), true);

  assertEquals(Zero.parse(id0), id0);
  assertEquals(Mixed.parse(idMixed), idMixed);
});

Deno.test("tnid: max length name works", () => {
  const Abcd = Tnid("abcd");
  const id = Abcd.new_v0();
  assertEquals(id.startsWith("abcd."), true);
  assertEquals(Abcd.parse(id), id);
});

Deno.test("tnid: rejects UUID with non-null after null in name encoding", () => {
  // Craft a UUID where name bits encode [a, 0, b, 0] (non-null after null terminator)
  // 'a' = 6 (0b00110), null = 0 (0b00000), 'b' = 7 (0b00111), null = 0 (0b00000)
  // name bits = 00110_00000_00111_00000 = 0x301C0 (but that has non-null after null)
  // Place at bits 108-127 of a UUIDv8 value
  const nameBits = (6 << 15) | (0 << 10) | (7 << 5) | 0; // [a, 0, b, 0]
  let value = BigInt(nameBits) << 108n;
  value |= 0x8n << 76n; // UUID version 8
  value |= 0b10n << 62n; // UUID variant

  const hex = value.toString(16).padStart(32, "0");
  const uuid = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${
    hex.slice(16, 20)
  }-${hex.slice(20)}`;

  assertThrows(
    () => UuidLike.toTnid(UuidLike.parse(uuid)),
    Error,
    "non-null value after null terminator",
  );
});

// =============================================================================
// Utility Methods
// =============================================================================

Deno.test("tnid: .toString() strips brand", () => {
  const UserId = Tnid("user");
  const id = UserId.new_v0();

  const str: string = id.toString();
  assertEquals(str, id);
  assertEquals(typeof str, "string");
});
