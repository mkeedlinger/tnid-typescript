/**
 * Tests that verify TypeScript V0 generation matches the Rust CLI.
 */

import { assertEquals } from "@std/assert";
import { Tnid } from "../../src/index.ts";
import {
  cliMakeV0,
  randomTimestamp,
  randomV0Random,
  randomName,
} from "./cli_harness.ts";

Deno.test("rust compat: V0 with zeros", async () => {
  const names = ["user", "test", "a", "abcd"];
  for (const name of names) {
    const tnid = Tnid(name as Parameters<typeof Tnid>[0]);
    const ts = tnid.v0_from_parts(0n, 0n);
    const rust = await cliMakeV0(name, 0n, 0n);
    assertEquals(ts, rust, `V0 mismatch for name="${name}" ts=0 r=0`);
  }
});

Deno.test("rust compat: V0 with specific values", async () => {
  const testCases: [string, bigint, bigint][] = [
    ["user", 1000n, 12345n],
    ["user", 1737903600000n, 0n],
    ["test", 0n, (1n << 57n) - 1n],
    ["a", (1n << 43n) - 1n, 0n],
    ["abcd", 123456789n, 987654321n],
  ];

  for (const [name, timestamp, random] of testCases) {
    const tnid = Tnid(name as Parameters<typeof Tnid>[0]);
    const ts = tnid.v0_from_parts(timestamp, random);
    const rust = await cliMakeV0(name, timestamp, random);
    assertEquals(ts, rust, `V0 mismatch for name="${name}" ts=${timestamp} r=${random}`);
  }
});

Deno.test("rust compat: V0 with random values", async () => {
  const iterations = 20;

  for (let i = 0; i < iterations; i++) {
    const name = randomName();
    const timestamp = randomTimestamp();
    const random = randomV0Random();

    const tnid = Tnid(name as Parameters<typeof Tnid>[0]);
    const ts = tnid.v0_from_parts(timestamp, random);
    const rust = await cliMakeV0(name, timestamp, random);
    assertEquals(ts, rust, `V0 random mismatch #${i}: name="${name}" ts=${timestamp} r=${random}`);
  }
});

Deno.test("rust compat: V0 parse round-trips", async () => {
  const names = ["user", "test", "a", "0"];

  for (const name of names) {
    const tnid = Tnid(name as Parameters<typeof Tnid>[0]);
    const v0 = tnid.v0_from_parts(randomTimestamp(), randomV0Random());
    const parsed = tnid.parse(v0);
    assertEquals(parsed, v0);
  }
});
