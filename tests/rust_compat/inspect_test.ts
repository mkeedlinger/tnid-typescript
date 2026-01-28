/**
 * Tests that verify TypeScript accessor methods match Rust CLI inspect output.
 */

import { assertEquals } from "@std/assert";
import { Tnid, DynamicTnid, UuidLike } from "../../src/index.ts";
import {
  cliInspect,
  randomTimestamp,
  randomV0Random,
  randomV1Random,
  randomName,
} from "./cli_harness.ts";

// =============================================================================
// UUID String Conversion
// =============================================================================

Deno.test("rust compat: toUuidString matches Rust for V0", async () => {
  const names = ["user", "test", "a", "0", "zzzz"];

  for (const name of names) {
    const factory = Tnid(name as Parameters<typeof Tnid>[0]);
    const id = factory.v0_from_parts(randomTimestamp(), randomV0Random());

    const tsUuid = DynamicTnid.toUuidString(id);
    const rustInspect = await cliInspect(id);

    assertEquals(tsUuid, rustInspect.uuidString, `UUID mismatch for ${name} V0`);
  }
});

Deno.test("rust compat: toUuidString matches Rust for V1", async () => {
  const names = ["user", "test", "a", "0", "zzzz"];

  for (const name of names) {
    const factory = Tnid(name as Parameters<typeof Tnid>[0]);
    const id = factory.v1_from_parts(randomV1Random());

    const tsUuid = DynamicTnid.toUuidString(id);
    const rustInspect = await cliInspect(id);

    assertEquals(tsUuid, rustInspect.uuidString, `UUID mismatch for ${name} V1`);
  }
});

Deno.test("rust compat: toUuidString uppercase matches Rust", async () => {
  const factory = Tnid("user");
  const id = factory.v0_from_parts(randomTimestamp(), randomV0Random());

  const tsUuidLower = DynamicTnid.toUuidString(id, "lower");
  const tsUuidUpper = DynamicTnid.toUuidString(id, "upper");
  const rustInspect = await cliInspect(id);

  assertEquals(tsUuidLower, rustInspect.uuidString);
  assertEquals(tsUuidUpper, rustInspect.uuidString.toUpperCase());
});

// =============================================================================
// Variant Detection
// =============================================================================

Deno.test("rust compat: getVariant matches Rust for V0", async () => {
  const iterations = 10;

  for (let i = 0; i < iterations; i++) {
    const name = randomName();
    const factory = Tnid(name as Parameters<typeof Tnid>[0]);
    const id = factory.v0_from_parts(randomTimestamp(), randomV0Random());

    const tsVariant = DynamicTnid.getVariant(id);
    const rustInspect = await cliInspect(id);

    // Rust returns "V0", TS returns "v0" - normalize to lowercase
    assertEquals(tsVariant, rustInspect.variant.toLowerCase(), `Variant mismatch for ${id}`);
  }
});

Deno.test("rust compat: getVariant matches Rust for V1", async () => {
  const iterations = 10;

  for (let i = 0; i < iterations; i++) {
    const name = randomName();
    const factory = Tnid(name as Parameters<typeof Tnid>[0]);
    const id = factory.v1_from_parts(randomV1Random());

    const tsVariant = DynamicTnid.getVariant(id);
    const rustInspect = await cliInspect(id);

    // Rust returns "V1", TS returns "v1" - normalize to lowercase
    assertEquals(tsVariant, rustInspect.variant.toLowerCase(), `Variant mismatch for ${id}`);
  }
});

// =============================================================================
// Name Extraction
// =============================================================================

Deno.test("rust compat: getName matches Rust", async () => {
  const names = ["user", "test", "a", "ab", "abc", "abcd", "0", "1234", "z", "zzzz", "a1b2"];

  for (const name of names) {
    const factory = Tnid(name as Parameters<typeof Tnid>[0]);
    const id = factory.v0_from_parts(randomTimestamp(), randomV0Random());

    const tsName = DynamicTnid.getName(id);
    const rustInspect = await cliInspect(id);

    assertEquals(tsName, rustInspect.name, `Name mismatch for ${name}`);
  }
});

// =============================================================================
// Name Hex
// =============================================================================

Deno.test("rust compat: getNameHex matches Rust", async () => {
  const names = ["user", "test", "a", "ab", "abc", "abcd", "0", "1234", "z", "zzzz"];

  for (const name of names) {
    const factory = Tnid(name as Parameters<typeof Tnid>[0]);
    const id = factory.v0_from_parts(0n, 0n);

    const tsNameHex = DynamicTnid.getNameHex(id);
    const rustInspect = await cliInspect(id);

    assertEquals(tsNameHex, rustInspect.nameHex, `NameHex mismatch for ${name}`);
  }
});

Deno.test("rust compat: factory.nameHex matches Rust", async () => {
  const names = ["user", "test", "a", "abcd", "0", "zzzz"];

  for (const name of names) {
    const factory = Tnid(name as Parameters<typeof Tnid>[0]);
    const id = factory.v0_from_parts(0n, 0n);

    const tsNameHex = factory.nameHex();
    const rustInspect = await cliInspect(id);

    assertEquals(tsNameHex, rustInspect.nameHex, `Factory nameHex mismatch for ${name}`);
  }
});

// =============================================================================
// Round-trip: TNID -> UUID -> TNID
// =============================================================================

Deno.test("rust compat: UUID round-trip preserves TNID", async () => {
  const iterations = 10;

  for (let i = 0; i < iterations; i++) {
    const name = randomName();
    const factory = Tnid(name as Parameters<typeof Tnid>[0]);

    // V0
    const v0 = factory.v0_from_parts(randomTimestamp(), randomV0Random());
    const v0Uuid = UuidLike.fromTnid(v0);
    const v0Back = factory.parseUuidString(v0Uuid);
    assertEquals(v0Back, v0, `V0 UUID round-trip failed for ${name}`);

    // V1
    const v1 = factory.v1_from_parts(randomV1Random());
    const v1Uuid = UuidLike.fromTnid(v1);
    const v1Back = factory.parseUuidString(v1Uuid);
    assertEquals(v1Back, v1, `V1 UUID round-trip failed for ${name}`);
  }
});

// =============================================================================
// Boundary Values
// =============================================================================

Deno.test("rust compat: boundary timestamp values", async () => {
  const factory = Tnid("user");
  const timestamps = [
    0n,
    1n,
    1000n,
    Date.now(),
    (1n << 43n) - 2n,
    (1n << 43n) - 1n, // max
  ];

  for (const ts of timestamps) {
    const id = factory.v0_from_parts(BigInt(ts), 0n);
    const rustInspect = await cliInspect(id);

    assertEquals(DynamicTnid.getVariant(id), rustInspect.variant.toLowerCase());
    assertEquals(DynamicTnid.getName(id), rustInspect.name);
    assertEquals(DynamicTnid.toUuidString(id), rustInspect.uuidString);
  }
});

Deno.test("rust compat: boundary random values for V0", async () => {
  const factory = Tnid("user");
  const randoms = [
    0n,
    1n,
    (1n << 57n) - 2n,
    (1n << 57n) - 1n, // max
  ];

  for (const r of randoms) {
    const id = factory.v0_from_parts(1000n, r);
    const rustInspect = await cliInspect(id);

    assertEquals(DynamicTnid.getVariant(id), rustInspect.variant.toLowerCase());
    assertEquals(DynamicTnid.toUuidString(id), rustInspect.uuidString);
  }
});

Deno.test("rust compat: boundary random values for V1", async () => {
  const factory = Tnid("user");
  const randoms = [
    0n,
    1n,
    (1n << 100n) - 2n,
    (1n << 100n) - 1n, // max
  ];

  for (const r of randoms) {
    const id = factory.v1_from_parts(r);
    const rustInspect = await cliInspect(id);

    assertEquals(DynamicTnid.getVariant(id), rustInspect.variant.toLowerCase());
    assertEquals(DynamicTnid.toUuidString(id), rustInspect.uuidString);
  }
});
