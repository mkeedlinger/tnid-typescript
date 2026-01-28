/**
 * Tests that verify TypeScript name encoding matches the Rust CLI.
 */

import { assertEquals } from "@std/assert";
import { Tnid } from "../../src/index.ts";
import { cliMakeV0, cliEncodeName } from "./cli_harness.ts";

// All 31 valid single characters: 0-4 and a-z
const ALL_VALID_CHARS = "01234abcdefghijklmnopqrstuvwxyz";

Deno.test("rust compat: name encoding matches for sample names", async () => {
  const names = ["user", "test", "a", "abcd", "0", "1234", "z", "zzzz"];

  for (const name of names) {
    const factory = Tnid(name as Parameters<typeof Tnid>[0]);
    const id = factory.v0_from_parts(0n, 0n);
    const rustId = await cliMakeV0(name, 0n, 0n);
    assertEquals(id, rustId, `Name encoding mismatch for "${name}"`);
  }
});

Deno.test("rust compat: all 31 single-char names encode correctly", async () => {
  for (const char of ALL_VALID_CHARS) {
    const factory = Tnid(char as Parameters<typeof Tnid>[0]);
    const tsHex = factory.nameHex();
    const rustHex = await cliEncodeName(char);

    assertEquals(tsHex, rustHex, `Name hex mismatch for single char "${char}"`);

    // Also verify generation matches
    const id = factory.v0_from_parts(0n, 0n);
    const rustId = await cliMakeV0(char, 0n, 0n);
    assertEquals(id, rustId, `Generation mismatch for single char "${char}"`);
  }
});

Deno.test("rust compat: two-char name combinations", async () => {
  // Test a sample of 2-char names
  const twoCharNames = [
    "aa", "az", "za", "zz",
    "00", "04", "40", "44",
    "a0", "0a", "z4", "4z",
    "ab", "xy", "12", "34",
  ];

  for (const name of twoCharNames) {
    const factory = Tnid(name as Parameters<typeof Tnid>[0]);
    const tsHex = factory.nameHex();
    const rustHex = await cliEncodeName(name);

    assertEquals(tsHex, rustHex, `Name hex mismatch for "${name}"`);
  }
});

Deno.test("rust compat: max length (4-char) names", async () => {
  const fourCharNames = [
    "aaaa", "zzzz", "0000", "4444",
    "abcd", "wxyz", "1234", "user",
    "test", "post", "item", "data",
    "a0z4", "0a4z",
  ];

  for (const name of fourCharNames) {
    const factory = Tnid(name as Parameters<typeof Tnid>[0]);
    const tsHex = factory.nameHex();
    const rustHex = await cliEncodeName(name);

    assertEquals(tsHex, rustHex, `Name hex mismatch for "${name}"`);

    const id = factory.v0_from_parts(0n, 0n);
    const rustId = await cliMakeV0(name, 0n, 0n);
    assertEquals(id, rustId, `Generation mismatch for "${name}"`);
  }
});
