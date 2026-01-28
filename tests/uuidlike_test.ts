import { assertEquals, assertThrows } from "@std/assert";
import { Tnid, UuidLike } from "../src/index.ts";

// =============================================================================
// UuidLike.fromTnid
// =============================================================================

Deno.test("uuidlike: fromTnid produces valid UUID format", () => {
  const UserId = Tnid("user");
  const id = UserId.new_v0();

  const uuid = UuidLike.fromTnid(id);

  // Check UUID format: 8-4-4-4-12 hex chars (lowercase)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
  assertEquals(uuidRegex.test(uuid), true);
});

Deno.test("uuidlike: toUpperCase produces uppercase UUID", () => {
  const UserId = Tnid("user");
  const id = UserId.new_v0();

  const uuidUpper = UuidLike.toUpperCase(UuidLike.fromTnid(id));
  const uuidUpperRegex = /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/;
  assertEquals(uuidUpperRegex.test(uuidUpper), true);
});

// =============================================================================
// UuidLike.parse
// =============================================================================

Deno.test("uuidlike: parse validates UUID format only", () => {
  // Valid UUID format (doesn't need to be a valid TNID)
  const uuid = UuidLike.parse("550e8400-e29b-41d4-a716-446655440000");
  assertEquals(uuid, "550e8400-e29b-41d4-a716-446655440000");

  // Invalid UUID format
  assertThrows(() => UuidLike.parse("not-a-uuid"), Error, "Invalid UUID format");
});

// =============================================================================
// UuidLike.toTnid
// =============================================================================

Deno.test("uuidlike: toTnid converts valid TNID UUIDs", () => {
  const UserId = Tnid("user");
  const PostId = Tnid("post");

  const userId = UserId.new_v0();
  const postId = PostId.new_v1();

  const userUuid = UuidLike.fromTnid(userId);
  const postUuid = UuidLike.fromTnid(postId);

  const parsed1 = UuidLike.toTnid(userUuid);
  const parsed2 = UuidLike.toTnid(postUuid);

  assertEquals(parsed1, userId);
  assertEquals(parsed2, postId);
});

Deno.test("uuidlike: toTnid rejects non-UUIDv8", () => {
  // UUIDv4 (version nibble is 4, not 8)
  const uuid = UuidLike.parse("550e8400-e29b-41d4-a716-446655440000");
  assertThrows(
    () => UuidLike.toTnid(uuid),
    Error,
    "not a valid UUIDv8"
  );
});

// =============================================================================
// UUID String Round-trips
// =============================================================================

Deno.test("uuidlike: parseUuidString round-trips correctly", () => {
  const UserId = Tnid("user");
  const original = UserId.new_v0();

  const uuid = UuidLike.fromTnid(original);
  const parsed = UserId.parseUuidString(uuid);

  assertEquals(parsed, original);
});

Deno.test("uuidlike: parseUuidString accepts uppercase", () => {
  const UserId = Tnid("user");
  const original = UserId.new_v0();

  const uuidUpper = UuidLike.toUpperCase(UuidLike.fromTnid(original));
  const parsed = UserId.parseUuidString(uuidUpper);

  assertEquals(parsed, original);
});

Deno.test("uuidlike: parseUuidString rejects wrong name", () => {
  const UserId = Tnid("user");
  const PostId = Tnid("post");

  const postId = PostId.new_v0();
  const postUuid = UuidLike.fromTnid(postId);

  assertThrows(
    () => UserId.parseUuidString(postUuid),
    Error,
    'name mismatch: expected "user", got "post"'
  );
});

Deno.test("uuidlike: parseUuidString rejects invalid UUID format", () => {
  const UserId = Tnid("user");

  assertThrows(
    () => UserId.parseUuidString("not-a-uuid"),
    Error,
    "Invalid UUID format"
  );

  assertThrows(
    () => UserId.parseUuidString("12345678-1234-1234-1234-12345678901"), // too short
    Error,
    "Invalid UUID format"
  );
});
