/**
 * Tests that verify TypeScript V1 generation matches the Rust CLI.
 */

import { assertEquals } from "@std/assert";
import { Tnid } from "../../src/index.ts";
import {
  cliMakeV1,
  randomV1Random,
  randomName,
} from "./cli_harness.ts";

Deno.test("rust compat: V1 with zeros", async () => {
  const names = ["user", "test", "a", "abcd"];
  for (const name of names) {
    const tnid = Tnid(name as Parameters<typeof Tnid>[0]);
    const ts = tnid.v1_from_parts(0n);
    const rust = await cliMakeV1(name, 0n);
    assertEquals(ts, rust, `V1 mismatch for name="${name}" r=0`);
  }
});

Deno.test("rust compat: V1 with specific values", async () => {
  const testCases: [string, bigint][] = [
    ["user", 12345n],
    ["user", (1n << 100n) - 1n],
    ["test", 0x123456789ABCDEFn],
    ["a", 1n],
    ["abcd", (1n << 50n)],
  ];

  for (const [name, random] of testCases) {
    const tnid = Tnid(name as Parameters<typeof Tnid>[0]);
    const ts = tnid.v1_from_parts(random);
    const rust = await cliMakeV1(name, random);
    assertEquals(ts, rust, `V1 mismatch for name="${name}" r=${random}`);
  }
});

Deno.test("rust compat: V1 with random values", async () => {
  const iterations = 20;

  for (let i = 0; i < iterations; i++) {
    const name = randomName();
    const random = randomV1Random();

    const tnid = Tnid(name as Parameters<typeof Tnid>[0]);
    const ts = tnid.v1_from_parts(random);
    const rust = await cliMakeV1(name, random);
    assertEquals(ts, rust, `V1 random mismatch #${i}: name="${name}" r=${random}`);
  }
});

Deno.test("rust compat: V1 parse round-trips", () => {
  const names = ["user", "test", "a", "0"];

  for (const name of names) {
    const tnid = Tnid(name as Parameters<typeof Tnid>[0]);
    const v1 = tnid.v1_from_parts(randomV1Random());
    const parsed = tnid.parse(v1);
    assertEquals(parsed, v1);
  }
});
