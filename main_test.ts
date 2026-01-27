import {
  assertEquals,
  assertThrows,
  assertNotEquals,
} from "@std/assert";
import {
  Tnid,
  TnidType,
  DynamicTnid,
  TnidVariant,
  UuidLike,
} from "./main.ts";

// =============================================================================
// COMPILE-TIME TESTS - Valid Names
// =============================================================================
// These should all compile without errors

Deno.test("compile: valid single-char names", () => {
  const A = Tnid("a");
  const Z = Tnid("z");
  const Zero = Tnid("0");
  const Four = Tnid("4");

  // Just verify they exist
  assertEquals(A.name, "a");
  assertEquals(Z.name, "z");
  assertEquals(Zero.name, "0");
  assertEquals(Four.name, "4");
});

Deno.test("compile: valid multi-char names", () => {
  const User = Tnid("user");
  const Post = Tnid("post");
  const Ab = Tnid("ab");
  const Abc = Tnid("abc");
  const A1b2 = Tnid("a1b2");

  assertEquals(User.name, "user");
  assertEquals(Post.name, "post");
  assertEquals(Ab.name, "ab");
  assertEquals(Abc.name, "abc");
  assertEquals(A1b2.name, "a1b2");
});

// =============================================================================
// COMPILE-TIME TESTS - Invalid Names (using @ts-expect-error)
// =============================================================================
// These SHOULD produce type errors - we use @ts-expect-error to verify

// =============================================================================
// COMPILE-TIME ONLY TESTS - These test that invalid code produces type errors
// The @ts-expect-error directive verifies the type error exists at compile time.
// We wrap these in `if (false)` to prevent runtime execution while still
// letting the type checker see the code.
// =============================================================================

Deno.test("compile: invalid names produce type errors", () => {
  // This block is never executed at runtime, but IS type-checked
  if (false as boolean) {
    // Empty string - not allowed
    // @ts-expect-error: empty string is not a valid TNID name
    Tnid("");

    // Too long (5+ chars)
    // @ts-expect-error: name too long (max 4 chars)
    Tnid("users");

    // Invalid character (5 is not valid - only 0-4)
    // @ts-expect-error: '5' is not a valid TNID name character
    Tnid("a5");

    // Invalid character (uppercase)
    // @ts-expect-error: uppercase letters are not valid
    Tnid("User");

    // Invalid character (hyphen)
    // @ts-expect-error: hyphen is not a valid TNID name character
    Tnid("a-b");

    // Invalid character (underscore)
    // @ts-expect-error: underscore is not a valid TNID name character
    Tnid("a_b");

    // Numbers 6-9 are not valid
    // @ts-expect-error: '6' is not a valid TNID name character
    Tnid("6");

    // @ts-expect-error: '9' is not a valid TNID name character
    Tnid("9");
  }
});

// =============================================================================
// COMPILE-TIME TESTS - Type Safety (branded types)
// =============================================================================

Deno.test("compile: branded types are incompatible", () => {
  const UserId = Tnid("user");
  const PostId = Tnid("post");

  type UserId = TnidType<typeof UserId>;
  type PostId = TnidType<typeof PostId>;

  const user: UserId = UserId.new_v0();
  const post: PostId = PostId.new_v0();

  // These should NOT compile - different brands
  // @ts-expect-error: PostId is not assignable to UserId
  const _wrongAssign1: UserId = post;

  // @ts-expect-error: UserId is not assignable to PostId
  const _wrongAssign2: PostId = user;

  // Verify the values exist at runtime
  assertEquals(typeof user, "string");
  assertEquals(typeof post, "string");
});

Deno.test("compile: plain string not assignable to TNID", () => {
  const UserId = Tnid("user");
  type UserId = TnidType<typeof UserId>;

  const plainString = "user.somedata12345678";

  // Plain strings should not be assignable to branded types
  // @ts-expect-error: string is not assignable to TnidValue<"user">
  const _wrong: UserId = plainString;

  assertEquals(typeof plainString, "string");
});

Deno.test("compile: no reasonable way to forge a TNID", () => {
  const UserId = Tnid("user");
  type UserId = TnidType<typeof UserId>;

  // This block is type-checked but not executed
  if (false as boolean) {
    // Plain string literal
    // @ts-expect-error: string literal not assignable
    const _a: UserId = "user.Bsz5OYC2MGu7Ime0e";

    // String variable
    const str = "user.Bsz5OYC2MGu7Ime0e";
    // @ts-expect-error: string not assignable
    const _b: UserId = str;

    // Template literal
    // @ts-expect-error: string not assignable
    const _c: UserId = `user.${"Bsz5OYC2MGu7Ime0e"}`;

    // Object with tnid property (not a string)
    const fake1 = { tnid: "user" as const };
    // @ts-expect-error: object is not assignable to string & { tnid }
    const _d: UserId = fake1;

    // String.prototype methods return string, not branded
    const valid = UserId.new_v0();
    // @ts-expect-error: string not assignable (slice returns string)
    const _e: UserId = valid.slice(0);

    // @ts-expect-error: string not assignable (concat returns string)
    const _f: UserId = valid.concat("");

    // @ts-expect-error: string not assignable (replace returns string)
    const _g: UserId = valid.replace("", "");

    // String() constructor
    // @ts-expect-error: string not assignable
    const _h: UserId = String(valid);

    // Note: JSON.parse returns `any`, which bypasses ALL type checking.
    // That's a TypeScript-wide hole, not specific to our branding.
    // const _i: UserId = JSON.parse(JSON.stringify(valid)); // sadly compiles

    // Interpolation loses brand
    // @ts-expect-error: string not assignable
    const _i: UserId = `${valid}`;

    // as const doesn't help
    // @ts-expect-error: string literal not assignable
    const _j: UserId = "user.Bsz5OYC2MGu7Ime0e" as const;

    // Spread into new string doesn't work
    // @ts-expect-error: string not assignable
    const _k: UserId = [...valid].join("");
  }
});

// =============================================================================
// RUNTIME TESTS - Generation
// =============================================================================

Deno.test("runtime: new_v0 generates valid TNID strings", () => {
  const UserId = Tnid("user");
  const id = UserId.new_v0();

  // Check format: name.data (data is 17 chars)
  const parts = id.split(".");
  assertEquals(parts.length, 2);
  assertEquals(parts[0], "user");
  assertEquals(parts[1].length, 17);
});

Deno.test("runtime: new_v0 generates unique IDs", () => {
  const UserId = Tnid("user");
  const id1 = UserId.new_v0();
  const id2 = UserId.new_v0();
  const id3 = UserId.new_v0();

  assertNotEquals(id1, id2);
  assertNotEquals(id2, id3);
  assertNotEquals(id1, id3);
});

Deno.test("runtime: generated IDs are valid strings", () => {
  const UserId = Tnid("user");
  const id = UserId.new_v0();

  assertEquals(typeof id, "string");
  // Verify it starts with the name
  assertEquals(id.startsWith("user."), true);
});

// =============================================================================
// RUNTIME TESTS - Parsing
// =============================================================================

Deno.test("runtime: parse accepts valid TNID strings", () => {
  const UserId = Tnid("user");

  // Generate an ID and then parse it
  const original = UserId.new_v0();
  const parsed = UserId.parse(original);

  assertEquals(parsed, original);
});

Deno.test("runtime: parse rejects wrong name", () => {
  const UserId = Tnid("user");
  const PostId = Tnid("post");

  const postId = PostId.new_v0();

  // Should throw because the name doesn't match
  assertThrows(
    () => UserId.parse(postId),
    Error,
    'name mismatch: expected "user", got "post"'
  );
});

Deno.test("runtime: parse rejects missing separator", () => {
  const UserId = Tnid("user");

  assertThrows(
    () => UserId.parse("usersomedata"),
    Error,
    "missing '.' separator"
  );
});

Deno.test("runtime: parse rejects invalid data length", () => {
  const UserId = Tnid("user");

  assertThrows(
    () => UserId.parse("user.tooshort"),
    Error,
    "Invalid data length"
  );
});

Deno.test("runtime: parse rejects invalid data characters", () => {
  const UserId = Tnid("user");

  // Using invalid characters (! is not in the data encoding)
  // Data portion must be exactly 17 characters
  assertThrows(
    () => UserId.parse("user.!!!!!!!!!!!!!!!!!"),
    Error,
    "Invalid data character"
  );
});

// =============================================================================
// RUNTIME TESTS - Utilities
// =============================================================================

Deno.test("runtime: .toString() strips brand", () => {
  const UserId = Tnid("user");
  const id = UserId.new_v0();

  // Native .toString() returns plain string type, stripping the brand
  const str: string = id.toString();
  assertEquals(str, id);
  assertEquals(typeof str, "string");
});


// =============================================================================
// RUNTIME TESTS - Round-trip encoding
// =============================================================================

Deno.test("runtime: round-trip encoding is stable", () => {
  const UserId = Tnid("user");

  for (let i = 0; i < 10; i++) {
    const original = UserId.new_v0();
    const parsed = UserId.parse(original);
    assertEquals(parsed, original);
  }
});

Deno.test("runtime: different names produce different prefixes", () => {
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
// RUNTIME TESTS - Name encoding edge cases
// =============================================================================

Deno.test("runtime: single char names work", () => {
  const A = Tnid("a");
  const id = A.new_v0();
  assertEquals(id.startsWith("a."), true);
  const parsed = A.parse(id);
  assertEquals(parsed, id);
});

Deno.test("runtime: numeric names work", () => {
  const Zero = Tnid("0");
  const Mixed = Tnid("a1b2");

  const id0 = Zero.new_v0();
  const idMixed = Mixed.new_v0();

  assertEquals(id0.startsWith("0."), true);
  assertEquals(idMixed.startsWith("a1b2."), true);

  assertEquals(Zero.parse(id0), id0);
  assertEquals(Mixed.parse(idMixed), idMixed);
});

Deno.test("runtime: max length name works", () => {
  const Abcd = Tnid("abcd");
  const id = Abcd.new_v0();
  assertEquals(id.startsWith("abcd."), true);
  assertEquals(Abcd.parse(id), id);
});

// =============================================================================
// RUNTIME TESTS - DynamicTnid and utility functions
// =============================================================================

Deno.test("runtime: DynamicTnid accepts any TNID", () => {
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

Deno.test("runtime: DynamicTnid.getVariant returns correct variant", () => {
  const UserId = Tnid("user");

  const v0 = UserId.new_v0();
  const v1 = UserId.new_v1();

  assertEquals(DynamicTnid.getVariant(v0), "v0");
  assertEquals(DynamicTnid.getVariant(v1), "v1");
});

Deno.test("runtime: DynamicTnid.getName extracts name correctly", () => {
  const UserId = Tnid("user");
  const PostId = Tnid("post");
  const A = Tnid("a");

  assertEquals(DynamicTnid.getName(UserId.new_v0()), "user");
  assertEquals(DynamicTnid.getName(PostId.new_v1()), "post");
  assertEquals(DynamicTnid.getName(A.new_v0()), "a");
});

Deno.test("runtime: UuidLike.fromTnid produces valid UUID format", () => {
  const UserId = Tnid("user");
  const id = UserId.new_v0();

  const uuid = UuidLike.fromTnid(id);

  // Check UUID format: 8-4-4-4-12 hex chars (lowercase)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
  assertEquals(uuidRegex.test(uuid), true);

  // Check uppercase option
  const uuidUpper = UuidLike.toUpperCase(UuidLike.fromTnid(id));
  const uuidUpperRegex = /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/;
  assertEquals(uuidUpperRegex.test(uuidUpper), true);
});

Deno.test("runtime: DynamicTnid.parse parses any valid TNID", () => {
  const UserId = Tnid("user");
  const PostId = Tnid("post");

  const userId = UserId.new_v0();
  const postId = PostId.new_v1();

  // Both should parse successfully
  const parsed1 = DynamicTnid.parse(userId);
  const parsed2 = DynamicTnid.parse(postId);

  assertEquals(parsed1, userId);
  assertEquals(parsed2, postId);

  assertEquals(DynamicTnid.getName(parsed1), "user");
  assertEquals(DynamicTnid.getName(parsed2), "post");
});

Deno.test("runtime: DynamicTnid.parse rejects invalid strings", () => {
  assertThrows(
    () => DynamicTnid.parse("invalid"),
    Error,
    "missing '.' separator"
  );

  assertThrows(
    () => DynamicTnid.parse("UPPER.12345678901234567"),
    Error,
    "Invalid TNID name"
  );
});

// =============================================================================
// RUNTIME TESTS - UUID string conversion
// =============================================================================

Deno.test("runtime: parseUuidString round-trips correctly", () => {
  const UserId = Tnid("user");
  const original = UserId.new_v0();

  const uuid = UuidLike.fromTnid(original);
  const parsed = UserId.parseUuidString(uuid);

  assertEquals(parsed, original);
});

Deno.test("runtime: parseUuidString accepts uppercase", () => {
  const UserId = Tnid("user");
  const original = UserId.new_v0();

  const uuidUpper = UuidLike.toUpperCase(UuidLike.fromTnid(original));
  const parsed = UserId.parseUuidString(uuidUpper);

  assertEquals(parsed, original);
});

Deno.test("runtime: parseUuidString rejects wrong name", () => {
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

Deno.test("runtime: parseUuidString rejects invalid UUID format", () => {
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

Deno.test("runtime: UuidLike.parse validates UUID format only", () => {
  // Valid UUID format (doesn't need to be a valid TNID)
  const uuid = UuidLike.parse("550e8400-e29b-41d4-a716-446655440000");
  assertEquals(uuid, "550e8400-e29b-41d4-a716-446655440000");

  // Invalid UUID format
  assertThrows(() => UuidLike.parse("not-a-uuid"), Error, "Invalid UUID format");
});

Deno.test("runtime: UuidLike.toTnid converts valid TNID UUIDs", () => {
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

Deno.test("runtime: UuidLike.toTnid rejects non-UUIDv8", () => {
  // UUIDv4 (version nibble is 4, not 8)
  const uuid = UuidLike.parse("550e8400-e29b-41d4-a716-446655440000");
  assertThrows(
    () => UuidLike.toTnid(uuid),
    Error,
    "not a valid UUIDv8"
  );
});

// =============================================================================
// RUNTIME TESTS - V0 vs V1 variants
// =============================================================================

Deno.test("runtime: v0_from_parts produces v0 variant", () => {
  const UserId = Tnid("user");
  const id = UserId.v0_from_parts(1000n, 12345n);

  assertEquals(DynamicTnid.getVariant(id), "v0");
});

Deno.test("runtime: v1_from_parts produces v1 variant", () => {
  const UserId = Tnid("user");
  const id = UserId.v1_from_parts(12345n);

  assertEquals(DynamicTnid.getVariant(id), "v1");
});

// =============================================================================
// RUNTIME TESTS - DynamicTnid.new_v0 / new_v1
// =============================================================================

Deno.test("runtime: DynamicTnid.new_v0 creates valid TNID", () => {
  const id = DynamicTnid.new_v0("user");

  assertEquals(DynamicTnid.getName(id), "user");
  assertEquals(DynamicTnid.getVariant(id), "v0");
});

Deno.test("runtime: DynamicTnid.new_v1 creates valid TNID", () => {
  const id = DynamicTnid.new_v1("post");

  assertEquals(DynamicTnid.getName(id), "post");
  assertEquals(DynamicTnid.getVariant(id), "v1");
});

Deno.test("runtime: DynamicTnid.new_v0 rejects invalid names", () => {
  assertThrows(() => DynamicTnid.new_v0(""), Error, "Invalid TNID name");
  assertThrows(() => DynamicTnid.new_v0("users"), Error, "Invalid TNID name");
  assertThrows(() => DynamicTnid.new_v0("User"), Error, "Invalid TNID name");
  assertThrows(() => DynamicTnid.new_v0("a-b"), Error, "Invalid TNID name");
});

Deno.test("runtime: DynamicTnid.new_v1 rejects invalid names", () => {
  assertThrows(() => DynamicTnid.new_v1(""), Error, "Invalid TNID name");
  assertThrows(() => DynamicTnid.new_v1("users"), Error, "Invalid TNID name");
});
