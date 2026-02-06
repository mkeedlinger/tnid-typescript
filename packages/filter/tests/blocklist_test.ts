import { assertEquals, assertThrows } from "@std/assert";
import { Blocklist } from "../src/blocklist.ts";

// ============================================================================
// Blocklist Construction
// ============================================================================

Deno.test("Blocklist: empty blocklist matches nothing", () => {
  const blocklist = new Blocklist([]);
  assertEquals(blocklist.containsMatch("anything"), false);
  assertEquals(blocklist.findFirstMatch("anything"), null);
});

Deno.test("Blocklist: ignores empty patterns", () => {
  const blocklist = new Blocklist(["", "TACO", ""]);
  assertEquals(blocklist.containsMatch("TACO"), true);
  assertEquals(blocklist.containsMatch("FOO"), false);
});

// ============================================================================
// Case-Insensitive Matching
// ============================================================================

Deno.test("Blocklist: matches case-insensitively", () => {
  const blocklist = new Blocklist(["TACO"]);
  assertEquals(blocklist.containsMatch("TACO"), true);
  assertEquals(blocklist.containsMatch("taco"), true);
  assertEquals(blocklist.containsMatch("Taco"), true);
  assertEquals(blocklist.containsMatch("tAcO"), true);
});

Deno.test("Blocklist: matches substrings", () => {
  const blocklist = new Blocklist(["TACO"]);
  assertEquals(blocklist.containsMatch("xyzTACOxyz"), true);
  assertEquals(blocklist.containsMatch("xyztacoxyz"), true);
});

Deno.test("Blocklist: no match returns false", () => {
  const blocklist = new Blocklist(["TACO", "FOO"]);
  assertEquals(blocklist.containsMatch("hello"), false);
  assertEquals(blocklist.containsMatch(""), false);
});

// ============================================================================
// Multiple Patterns
// ============================================================================

Deno.test("Blocklist: matches any pattern", () => {
  const blocklist = new Blocklist(["TACO", "FOO", "BAZZ"]);
  assertEquals(blocklist.containsMatch("TACO"), true);
  assertEquals(blocklist.containsMatch("FOO"), true);
  assertEquals(blocklist.containsMatch("BAZZ"), true);
  assertEquals(blocklist.containsMatch("BAR"), false);
});

// ============================================================================
// findFirstMatch
// ============================================================================

Deno.test("Blocklist: findFirstMatch returns position and length", () => {
  const blocklist = new Blocklist(["TACO"]);
  const match = blocklist.findFirstMatch("xyzTACOxyz");
  assertEquals(match, { start: 3, length: 4 });
});

Deno.test("Blocklist: findFirstMatch returns null on no match", () => {
  const blocklist = new Blocklist(["TACO"]);
  assertEquals(blocklist.findFirstMatch("hello"), null);
});

Deno.test("Blocklist: findFirstMatch at start of string", () => {
  const blocklist = new Blocklist(["TACO"]);
  const match = blocklist.findFirstMatch("TACOxyz");
  assertEquals(match, { start: 0, length: 4 });
});

// ============================================================================
// Pattern Validation
// ============================================================================

Deno.test("Blocklist: accepts valid TNID data characters", () => {
  const blocklist = new Blocklist(["ABC", "a0-_Z"]);
  assertEquals(blocklist.containsMatch("xABCx"), true);
});

Deno.test("Blocklist: rejects patterns with invalid characters", () => {
  const invalid = ["A.B", "C+D", "foo bar", "hello!", "test@"];
  for (const p of invalid) {
    assertThrows(
      () => new Blocklist([p]),
      Error,
      "invalid blocklist pattern",
    );
  }
});

// ============================================================================
// Edge Cases
// ============================================================================

Deno.test("Blocklist: findFirstMatch at end of string", () => {
  const blocklist = new Blocklist(["XYZ"]);
  const match = blocklist.findFirstMatch("abcXYZ");
  assertEquals(match, { start: 3, length: 3 });
});

Deno.test("Blocklist: single-character pattern", () => {
  const blocklist = new Blocklist(["X"]);
  assertEquals(blocklist.containsMatch("aXb"), true);
  assertEquals(blocklist.containsMatch("axb"), true); // case-insensitive
  assertEquals(blocklist.containsMatch("abc"), false);
  const match = blocklist.findFirstMatch("abXcd");
  assertEquals(match, { start: 2, length: 1 });
});

Deno.test("Blocklist: overlapping patterns", () => {
  const blocklist = new Blocklist(["ABC", "BCD"]);
  // "ABCD" contains both "ABC" and "BCD" — should find first match
  const match = blocklist.findFirstMatch("ABCD");
  assertEquals(match !== null, true);
  // First match should start at 0 (ABC) or 1 (BCD) depending on regex engine
  assertEquals(match!.start === 0 || match!.start === 1, true);
});

Deno.test("Blocklist: all empty patterns creates empty blocklist", () => {
  const blocklist = new Blocklist(["", "", ""]);
  assertEquals(blocklist.containsMatch("anything"), false);
  assertEquals(blocklist.findFirstMatch("anything"), null);
});

Deno.test("Blocklist: full-string match", () => {
  const blocklist = new Blocklist(["ABCDE"]);
  const match = blocklist.findFirstMatch("ABCDE");
  assertEquals(match, { start: 0, length: 5 });
});
