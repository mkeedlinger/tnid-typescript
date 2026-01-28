/**
 * Tests for bit extraction/expansion matching Rust implementation.
 */

import { assertEquals } from "@std/assert";
import {
  COMPLETE_SECRET_DATA_MASK,
  expandSecretDataBits,
  extractSecretDataBits,
  fromHexDigits,
  getVariant,
  LEFT_SECRET_DATA_SECTION_MASK,
  MIDDLE_SECRET_DATA_SECTION_MASK,
  RIGHT_SECRET_DATA_SECTION_MASK,
  SECRET_DATA_BIT_NUM,
  setVariant,
  toHexDigits,
} from "../src/bits.ts";

Deno.test("bits: masks have correct bit counts", () => {
  // Count bits in each mask using BigInt
  function countBits(n: bigint): number {
    let count = 0;
    while (n > 0n) {
      count += Number(n & 1n);
      n >>= 1n;
    }
    return count;
  }

  // Right: 60 bits (bits 0-59, excluding UUID version bits 60-63)
  assertEquals(countBits(RIGHT_SECRET_DATA_SECTION_MASK), 60);

  // Middle: 12 bits (bits 64-75, excluding UUID variant bits)
  assertEquals(countBits(MIDDLE_SECRET_DATA_SECTION_MASK), 12);

  // Left: 28 bits (bits 80-107)
  assertEquals(countBits(LEFT_SECRET_DATA_SECTION_MASK), 28);

  // Complete: 100 bits
  assertEquals(countBits(COMPLETE_SECRET_DATA_MASK), SECRET_DATA_BIT_NUM);
});

Deno.test("bits: extract correctly compacts bits", () => {
  // When all Payload bits are 1, extraction should give 100 bits of 1s
  const extracted = extractSecretDataBits(COMPLETE_SECRET_DATA_MASK);

  // Should have 100 bits set (leading zeros = 128 - 100 = 28)
  let count = 0;
  let n = extracted;
  while (n > 0n) {
    count += Number(n & 1n);
    n >>= 1n;
  }
  assertEquals(count, 100);

  // All bits should be in lower 100 positions
  assertEquals(extracted >> 100n, 0n);
});

Deno.test("bits: expand correctly scatters bits", () => {
  // When we have 100 bits of 1s, expansion should give back the complete mask
  const allOnes100 = (1n << 100n) - 1n;
  const expanded = expandSecretDataBits(allOnes100);

  assertEquals(expanded, COMPLETE_SECRET_DATA_MASK);
});

Deno.test("bits: extract/expand round-trip", () => {
  // Extract then expand should give back the original (masked)
  const original = COMPLETE_SECRET_DATA_MASK;
  const extracted = extractSecretDataBits(original);
  const expanded = expandSecretDataBits(extracted);
  assertEquals(expanded, original);

  // Test with an arbitrary pattern
  const pattern = 0x00000aaa_aaaa_0000_0555_555555555555n;
  const extractedPattern = extractSecretDataBits(pattern);
  const expandedPattern = expandSecretDataBits(extractedPattern);
  assertEquals(
    expandedPattern & COMPLETE_SECRET_DATA_MASK,
    pattern & COMPLETE_SECRET_DATA_MASK,
  );
});

Deno.test("bits: hex digit conversion round-trip", () => {
  // 100 bits = 25 hex digits
  const value = 0x123456789abcdef0123456789n; // 25 hex digits

  const digits = toHexDigits(value);
  assertEquals(digits.length, 25);

  const recovered = fromHexDigits(digits);
  assertEquals(recovered, value);
});

Deno.test("bits: variant detection", () => {
  // TNID variant is at bits 60-61
  // V0: bits 60-61 = 00
  const v0 = 0x00000000_0000_0000_0000_000000000000n;
  assertEquals(getVariant(v0), "v0");

  // V1: bits 60-61 = 01 (bit 60 set)
  const v1 = 1n << 60n; // 0x1000000000000000
  assertEquals(getVariant(v1), "v1");

  // V2: bits 60-61 = 10 (bit 61 set)
  const v2 = 2n << 60n; // 0x2000000000000000
  assertEquals(getVariant(v2), "v2");

  // V3: bits 60-61 = 11 (both bits set)
  const v3 = 3n << 60n; // 0x3000000000000000
  assertEquals(getVariant(v3), "v3");
});

Deno.test("bits: variant setting", () => {
  const base = 0xffffff_ffff_ffff_ffff_ffffffffffffn;

  const asV0 = setVariant(base, "v0");
  assertEquals(getVariant(asV0), "v0");

  const asV1 = setVariant(base, "v1");
  assertEquals(getVariant(asV1), "v1");
});
