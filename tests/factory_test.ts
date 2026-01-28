import {
  assertEquals,
  assertThrows,
  assertNotEquals,
} from "@std/assert";
import { Tnid, DynamicTnid } from "../src/index.ts";

// =============================================================================
// Generation Tests
// =============================================================================

Deno.test("factory: new_v0 generates valid TNID strings", () => {
  const UserId = Tnid("user");
  const id = UserId.new_v0();

  const parts = id.split(".");
  assertEquals(parts.length, 2);
  assertEquals(parts[0], "user");
  assertEquals(parts[1].length, 17);
});

Deno.test("factory: new_v0 generates unique IDs", () => {
  const UserId = Tnid("user");
  const id1 = UserId.new_v0();
  const id2 = UserId.new_v0();
  const id3 = UserId.new_v0();

  assertNotEquals(id1, id2);
  assertNotEquals(id2, id3);
  assertNotEquals(id1, id3);
});

Deno.test("factory: generated IDs are valid strings", () => {
  const UserId = Tnid("user");
  const id = UserId.new_v0();

  assertEquals(typeof id, "string");
  assertEquals(id.startsWith("user."), true);
});

Deno.test("factory: v0_from_parts produces v0 variant", () => {
  const UserId = Tnid("user");
  const id = UserId.v0_from_parts(1000n, 12345n);

  assertEquals(DynamicTnid.getVariant(id), "v0");
});

Deno.test("factory: v1_from_parts produces v1 variant", () => {
  const UserId = Tnid("user");
  const id = UserId.v1_from_parts(12345n);

  assertEquals(DynamicTnid.getVariant(id), "v1");
});

// =============================================================================
// Parsing Tests
// =============================================================================

Deno.test("factory: parse accepts valid TNID strings", () => {
  const UserId = Tnid("user");

  const original = UserId.new_v0();
  const parsed = UserId.parse(original);

  assertEquals(parsed, original);
});

Deno.test("factory: parse rejects wrong name", () => {
  const UserId = Tnid("user");
  const PostId = Tnid("post");

  const postId = PostId.new_v0();

  assertThrows(
    () => UserId.parse(postId),
    Error,
    'name mismatch: expected "user", got "post"'
  );
});

Deno.test("factory: parse rejects missing separator", () => {
  const UserId = Tnid("user");

  assertThrows(
    () => UserId.parse("usersomedata"),
    Error,
    "missing '.' separator"
  );
});

Deno.test("factory: parse rejects invalid data length", () => {
  const UserId = Tnid("user");

  assertThrows(
    () => UserId.parse("user.tooshort"),
    Error,
    "Invalid data length"
  );
});

Deno.test("factory: parse rejects invalid data characters", () => {
  const UserId = Tnid("user");

  assertThrows(
    () => UserId.parse("user.!!!!!!!!!!!!!!!!!"),
    Error,
    "Invalid data character"
  );
});

// =============================================================================
// Round-trip Tests
// =============================================================================

Deno.test("factory: round-trip encoding is stable", () => {
  const UserId = Tnid("user");

  for (let i = 0; i < 10; i++) {
    const original = UserId.new_v0();
    const parsed = UserId.parse(original);
    assertEquals(parsed, original);
  }
});

Deno.test("factory: different names produce different prefixes", () => {
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

Deno.test("factory: single char names work", () => {
  const A = Tnid("a");
  const id = A.new_v0();
  assertEquals(id.startsWith("a."), true);
  const parsed = A.parse(id);
  assertEquals(parsed, id);
});

Deno.test("factory: numeric names work", () => {
  const Zero = Tnid("0");
  const Mixed = Tnid("a1b2");

  const id0 = Zero.new_v0();
  const idMixed = Mixed.new_v0();

  assertEquals(id0.startsWith("0."), true);
  assertEquals(idMixed.startsWith("a1b2."), true);

  assertEquals(Zero.parse(id0), id0);
  assertEquals(Mixed.parse(idMixed), idMixed);
});

Deno.test("factory: max length name works", () => {
  const Abcd = Tnid("abcd");
  const id = Abcd.new_v0();
  assertEquals(id.startsWith("abcd."), true);
  assertEquals(Abcd.parse(id), id);
});

// =============================================================================
// Utility Methods
// =============================================================================

Deno.test("factory: .toString() strips brand", () => {
  const UserId = Tnid("user");
  const id = UserId.new_v0();

  const str: string = id.toString();
  assertEquals(str, id);
  assertEquals(typeof str, "string");
});
