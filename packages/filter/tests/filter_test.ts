import { assertEquals, assertThrows } from "@std/assert";
import { Tnid } from "@tnid/core";
import { Blocklist, FilterError, newV0Filtered, newV1Filtered } from "../src/index.ts";

const UserId = Tnid("user");

// ============================================================================
// newV0Filtered
// ============================================================================

Deno.test("newV0Filtered: generates valid TNID", () => {
  const blocklist = new Blocklist(["TACO"]);
  const id = newV0Filtered(UserId, blocklist);
  assertEquals(id.startsWith("user."), true);
  assertEquals(UserId.variant(id), "v0");
});

Deno.test("newV0Filtered: data string doesn't contain blocked words", () => {
  const blocklist = new Blocklist(["TACO", "FOO", "BAZZ"]);
  for (let i = 0; i < 100; i++) {
    const id = newV0Filtered(UserId, blocklist);
    const data = id.substring(id.indexOf(".") + 1).toUpperCase();
    assertEquals(data.includes("TACO"), false, `ID ${id} contains TACO`);
    assertEquals(data.includes("FOO"), false, `ID ${id} contains FOO`);
    assertEquals(data.includes("BAZZ"), false, `ID ${id} contains BAZZ`);
  }
});

Deno.test("newV0Filtered: empty blocklist always succeeds", () => {
  const blocklist = new Blocklist([]);
  const id = newV0Filtered(UserId, blocklist);
  assertEquals(id.startsWith("user."), true);
});

// ============================================================================
// newV1Filtered
// ============================================================================

Deno.test("newV1Filtered: generates valid TNID", () => {
  const blocklist = new Blocklist(["TACO"]);
  const id = newV1Filtered(UserId, blocklist);
  assertEquals(id.startsWith("user."), true);
  assertEquals(UserId.variant(id), "v1");
});

Deno.test("newV1Filtered: data string doesn't contain blocked words", () => {
  const blocklist = new Blocklist(["TACO", "FOO", "BAZZ"]);
  for (let i = 0; i < 100; i++) {
    const id = newV1Filtered(UserId, blocklist);
    const data = id.substring(id.indexOf(".") + 1).toUpperCase();
    assertEquals(data.includes("TACO"), false, `ID ${id} contains TACO`);
    assertEquals(data.includes("FOO"), false, `ID ${id} contains FOO`);
    assertEquals(data.includes("BAZZ"), false, `ID ${id} contains BAZZ`);
  }
});

Deno.test("newV1Filtered: empty blocklist always succeeds", () => {
  const blocklist = new Blocklist([]);
  const id = newV1Filtered(UserId, blocklist);
  assertEquals(id.startsWith("user."), true);
});

// ============================================================================
// FilterError
// ============================================================================

Deno.test("FilterError: has correct properties", () => {
  const err = new FilterError(100);
  assertEquals(err.name, "FilterError");
  assertEquals(err.iterations, 100);
  assertEquals(err.message.includes("100"), true);
});
