import { assertEquals } from "@std/assert";
import {
  dataString,
  FIRST_CHAR_WITH_RANDOM,
  handleV0Match,
  matchTouchesRandomPortion,
  timestampBumpForChar,
} from "../src/internals.ts";

// ============================================================================
// dataString
// ============================================================================

Deno.test("dataString: extracts data after dot", () => {
  assertEquals(dataString("user.ABCDEFGHIJKLMNOPQ"), "ABCDEFGHIJKLMNOPQ");
});

Deno.test("dataString: works with single-char name", () => {
  assertEquals(dataString("a.ABCDEFGHIJKLMNOPQ"), "ABCDEFGHIJKLMNOPQ");
});

Deno.test("dataString: works with 4-char name", () => {
  assertEquals(dataString("test.ABCDEFGHIJKLMNOPQ"), "ABCDEFGHIJKLMNOPQ");
});

// ============================================================================
// matchTouchesRandomPortion
// ============================================================================

Deno.test("matchTouchesRandomPortion: match fully in timestamp (chars 0-6)", () => {
  // Match at chars 0-3 (length 4): 0+4=4 <= 7
  assertEquals(matchTouchesRandomPortion(0, 4), false);
  // Match at chars 3-6 (length 4): 3+4=7 <= 7
  assertEquals(matchTouchesRandomPortion(3, 4), false);
  // Match at chars 0-6 (length 7): 0+7=7 <= 7
  assertEquals(matchTouchesRandomPortion(0, 7), false);
});

Deno.test("matchTouchesRandomPortion: match touching char 7 (mixed)", () => {
  // Match at chars 6-7 (length 2): 6+2=8 > 7
  assertEquals(matchTouchesRandomPortion(6, 2), true);
  // Match at chars 0-7 (length 8): 0+8=8 > 7
  assertEquals(matchTouchesRandomPortion(0, 8), true);
});

Deno.test("matchTouchesRandomPortion: match fully in random (chars 8+)", () => {
  assertEquals(matchTouchesRandomPortion(8, 4), true);
  assertEquals(matchTouchesRandomPortion(13, 4), true);
});

Deno.test("matchTouchesRandomPortion: single char at boundary", () => {
  // Char 6 (last pure timestamp): 6+1=7, not > 7
  assertEquals(matchTouchesRandomPortion(6, 1), false);
  // Char 7 (first with random): 7+1=8 > 7
  assertEquals(matchTouchesRandomPortion(7, 1), true);
});

Deno.test("FIRST_CHAR_WITH_RANDOM is 7", () => {
  assertEquals(FIRST_CHAR_WITH_RANDOM, 7);
});

// ============================================================================
// timestampBumpForChar
// ============================================================================

Deno.test("timestampBumpForChar: values match Rust implementation", () => {
  // Each char encodes 6 bits. Bump = 2^(42 - 6*pos)
  assertEquals(timestampBumpForChar(0), 1n << 42n); // 4398046511104
  assertEquals(timestampBumpForChar(1), 1n << 36n); // 68719476736
  assertEquals(timestampBumpForChar(2), 1n << 30n); // 1073741824
  assertEquals(timestampBumpForChar(3), 1n << 24n); // 16777216
  assertEquals(timestampBumpForChar(4), 1n << 18n); // 262144
  assertEquals(timestampBumpForChar(5), 1n << 12n); // 4096
  assertEquals(timestampBumpForChar(6), 1n << 6n);  // 64
});

Deno.test("timestampBumpForChar: lower positions have larger bumps", () => {
  for (let i = 0; i < 6; i++) {
    const higher = timestampBumpForChar(i);
    const lower = timestampBumpForChar(i + 1);
    assertEquals(higher > lower, true, `pos ${i} should be larger than pos ${i + 1}`);
    assertEquals(higher, lower * 64n, `each step should be 64x (2^6)`);
  }
});

// ============================================================================
// handleV0Match
// ============================================================================

Deno.test("handleV0Match: bumps timestamp for pure-timestamp match", () => {
  const ts = 1000000n;
  // Match at chars 2-4 (length 3) — rightmost char is 4
  const result = handleV0Match({ start: 2, length: 3 }, ts);
  assertEquals(result, ts + timestampBumpForChar(4));
});

Deno.test("handleV0Match: returns same timestamp for random-portion match", () => {
  const ts = 1000000n;
  // Match at chars 8-11 (length 4) — fully in random
  const result = handleV0Match({ start: 8, length: 4 }, ts);
  assertEquals(result, ts);
});

Deno.test("handleV0Match: returns same timestamp for match spanning boundary", () => {
  const ts = 1000000n;
  // Match at chars 5-8 (length 4) — crosses into random at char 7
  const result = handleV0Match({ start: 5, length: 4 }, ts);
  assertEquals(result, ts);
});

Deno.test("handleV0Match: bumps by rightmost char, not leftmost", () => {
  const ts = 0n;
  // Match at chars 0-2 (length 3): rightmost is char 2
  const result = handleV0Match({ start: 0, length: 3 }, ts);
  assertEquals(result, timestampBumpForChar(2));

  // Match at chars 4-6 (length 3): rightmost is char 6
  const result2 = handleV0Match({ start: 4, length: 3 }, ts);
  assertEquals(result2, timestampBumpForChar(6));
});
