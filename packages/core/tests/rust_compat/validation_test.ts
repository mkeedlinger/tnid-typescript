/**
 * Tests that verify TypeScript name validation matches the Rust CLI.
 */

import { assertEquals } from "@std/assert";
import { DynamicTnid } from "../../src/index.ts";
import { cliValidateName } from "./cli_harness.ts";

// Test that TS validation matches Rust for valid names
Deno.test("rust compat: valid names pass validation", async () => {
  const validNames = [
    // Single chars
    "a", "z", "0", "4",
    // Two chars
    "ab", "zz", "00", "a0",
    // Three chars
    "abc", "xyz", "123",
    // Four chars (max)
    "abcd", "user", "test", "zzzz", "0000", "a1b2",
  ];

  for (const name of validNames) {
    const rustValid = await cliValidateName(name);

    // TS validation: try to create, should not throw
    let tsValid = true;
    try {
      DynamicTnid.newV0(name);
    } catch {
      tsValid = false;
    }

    assertEquals(tsValid, rustValid, `Validation mismatch for valid name "${name}"`);
    assertEquals(tsValid, true, `"${name}" should be valid`);
  }
});

// Test that TS validation matches Rust for invalid names
Deno.test("rust compat: invalid names fail validation", async () => {
  const invalidNames = [
    // Empty
    "",
    // Too long (5+ chars)
    "users", "abcde", "testing",
    // Invalid chars: uppercase
    "A", "User", "TEST", "aBc",
    // Invalid chars: 5-9
    "5", "6", "7", "8", "9", "a5", "56",
    // Invalid chars: special
    "-", "_", ".", " ", "a-b", "a_b", "a.b",
    // Invalid chars: unicode/symbols
    "!", "@", "#", "$",
  ];

  for (const name of invalidNames) {
    const rustValid = await cliValidateName(name);

    // TS validation: try to create, should throw
    let tsValid = true;
    try {
      DynamicTnid.newV0(name);
    } catch {
      tsValid = false;
    }

    assertEquals(tsValid, rustValid, `Validation mismatch for invalid name "${name}"`);
    assertEquals(tsValid, false, `"${name}" should be invalid`);
  }
});

// Test edge cases
Deno.test("rust compat: boundary validation cases", async () => {
  // Exactly 4 chars (valid max)
  const maxValid = "abcd";
  assertEquals(await cliValidateName(maxValid), true);

  let tsMaxValid = true;
  try { DynamicTnid.newV0(maxValid); } catch { tsMaxValid = false; }
  assertEquals(tsMaxValid, true);

  // Exactly 5 chars (invalid - too long)
  const tooLong = "abcde";
  assertEquals(await cliValidateName(tooLong), false);

  let tsTooLong = true;
  try { DynamicTnid.newV0(tooLong); } catch { tsTooLong = false; }
  assertEquals(tsTooLong, false);
});
