import { assertEquals } from "@std/assert";
import { Tnid, TnidType } from "../src/index.ts";

// =============================================================================
// COMPILE-TIME TESTS - Valid Names
// =============================================================================

Deno.test("compile: valid single-char names", () => {
  const A = Tnid("a");
  const Z = Tnid("z");
  const Zero = Tnid("0");
  const Four = Tnid("4");

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

  assertEquals(typeof user, "string");
  assertEquals(typeof post, "string");
});

Deno.test("compile: plain string not assignable to TNID", () => {
  const UserId = Tnid("user");
  type UserId = TnidType<typeof UserId>;

  const plainString = "user.somedata12345678";

  // @ts-expect-error: string is not assignable to TnidValue<"user">
  const _wrong: UserId = plainString;

  assertEquals(typeof plainString, "string");
});

Deno.test("compile: no reasonable way to forge a TNID", () => {
  const UserId = Tnid("user");
  type UserId = TnidType<typeof UserId>;

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
