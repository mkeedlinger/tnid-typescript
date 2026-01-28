/**
 * Tests that verify TypeScript name encoding matches the Rust CLI.
 */

import { assertEquals } from "@std/assert";
import { Tnid } from "../../src/index.ts";
import { cliMakeV0, cliEncodeName } from "./cli_harness.ts";

Deno.test("rust compat: name encoding matches", async () => {
  const names = ["user", "test", "a", "abcd", "0", "1234", "z", "zzzz"];

  for (const name of names) {
    const rustHex = await cliEncodeName(name);
    const factory = Tnid(name as Parameters<typeof Tnid>[0]);
    // Generate an ID and extract name from inspection
    const id = factory.v0_from_parts(0n, 0n);
    // The name encoding is embedded in the TNID - if generation matches, encoding matches
    const rustId = await cliMakeV0(name, 0n, 0n);
    assertEquals(id, rustId, `Name encoding mismatch for "${name}"`);
  }
});
