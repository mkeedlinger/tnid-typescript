import { assertEquals, assertThrows } from "@std/assert";
import { Tnid, type TnidType, DynamicTnid } from "../src/index.ts";

// =============================================================================
// DynamicTnid Type Compatibility
// =============================================================================

Deno.test("dynamic: accepts any TNID", () => {
  const UserId = Tnid("user");
  const PostId = Tnid("post");

  type UserId = TnidType<typeof UserId>;
  type PostId = TnidType<typeof PostId>;

  const userId: UserId = UserId.new_v0();
  const postId: PostId = PostId.new_v0();

  // Both should be assignable to DynamicTnid
  const dynamic1: DynamicTnid = userId;
  const dynamic2: DynamicTnid = postId;

  assertEquals(typeof dynamic1, "string");
  assertEquals(typeof dynamic2, "string");
});

// =============================================================================
// DynamicTnid.getVariant
// =============================================================================

Deno.test("dynamic: getVariant returns correct variant", () => {
  const UserId = Tnid("user");

  const v0 = UserId.new_v0();
  const v1 = UserId.new_v1();

  assertEquals(DynamicTnid.getVariant(v0), "v0");
  assertEquals(DynamicTnid.getVariant(v1), "v1");
});

// =============================================================================
// DynamicTnid.getName
// =============================================================================

Deno.test("dynamic: getName extracts name correctly", () => {
  const UserId = Tnid("user");
  const PostId = Tnid("post");
  const A = Tnid("a");

  assertEquals(DynamicTnid.getName(UserId.new_v0()), "user");
  assertEquals(DynamicTnid.getName(PostId.new_v1()), "post");
  assertEquals(DynamicTnid.getName(A.new_v0()), "a");
});

// =============================================================================
// DynamicTnid.parse
// =============================================================================

Deno.test("dynamic: parse parses any valid TNID", () => {
  const UserId = Tnid("user");
  const PostId = Tnid("post");

  const userId = UserId.new_v0();
  const postId = PostId.new_v1();

  const parsed1 = DynamicTnid.parse(userId);
  const parsed2 = DynamicTnid.parse(postId);

  assertEquals(parsed1, userId);
  assertEquals(parsed2, postId);

  assertEquals(DynamicTnid.getName(parsed1), "user");
  assertEquals(DynamicTnid.getName(parsed2), "post");
});

Deno.test("dynamic: parse rejects invalid strings", () => {
  // Wrong length - rejected before format detection
  assertThrows(
    () => DynamicTnid.parse("invalid"),
    Error,
    "expected TNID string (19-22 chars) or UUID (36 chars)"
  );

  // Valid TNID length (22 chars) with dot, but invalid name (uppercase)
  assertThrows(
    () => DynamicTnid.parse("UPPR.1234567890123456-"),
    Error,
    "Invalid TNID name"
  );
});

Deno.test("dynamic: parseTnidString rejects missing separator", () => {
  assertThrows(
    () => DynamicTnid.parseTnidString("invalid"),
    Error,
    "missing '.' separator"
  );
});

// =============================================================================
// DynamicTnid.newV0 / newV1
// =============================================================================

Deno.test("dynamic: newV0 creates valid TNID", () => {
  const id = DynamicTnid.newV0("user");

  assertEquals(DynamicTnid.getName(id), "user");
  assertEquals(DynamicTnid.getVariant(id), "v0");
});

Deno.test("dynamic: newV1 creates valid TNID", () => {
  const id = DynamicTnid.newV1("post");

  assertEquals(DynamicTnid.getName(id), "post");
  assertEquals(DynamicTnid.getVariant(id), "v1");
});

Deno.test("dynamic: newV0 rejects invalid names", () => {
  assertThrows(() => DynamicTnid.newV0(""), Error, "Invalid TNID name");
  assertThrows(() => DynamicTnid.newV0("users"), Error, "Invalid TNID name");
  assertThrows(() => DynamicTnid.newV0("User"), Error, "Invalid TNID name");
  assertThrows(() => DynamicTnid.newV0("a-b"), Error, "Invalid TNID name");
});

Deno.test("dynamic: newV1 rejects invalid names", () => {
  assertThrows(() => DynamicTnid.newV1(""), Error, "Invalid TNID name");
  assertThrows(() => DynamicTnid.newV1("users"), Error, "Invalid TNID name");
});
