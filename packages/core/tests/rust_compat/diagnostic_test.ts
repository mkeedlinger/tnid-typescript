/**
 * Diagnostic tests that trace encoding steps for debugging mismatches.
 */

import { assertEquals } from "@std/assert";
import { Tnid } from "../../src/index.ts";
import { cliInspect, cliMakeV0, cliMakeV1 } from "./cli_harness.ts";

// =============================================================================
// Diagnostic Helpers - Trace encoding steps for debugging
// =============================================================================

/** Encode a name into 20 bits (mirrors name_encoding.ts) */
function encodeName(name: string): number {
  const NAME_CHAR_TO_VALUE: Record<string, number> = {
    "0": 1,
    "1": 2,
    "2": 3,
    "3": 4,
    "4": 5,
    a: 6,
    b: 7,
    c: 8,
    d: 9,
    e: 10,
    f: 11,
    g: 12,
    h: 13,
    i: 14,
    j: 15,
    k: 16,
    l: 17,
    m: 18,
    n: 19,
    o: 20,
    p: 21,
    q: 22,
    r: 23,
    s: 24,
    t: 25,
    u: 26,
    v: 27,
    w: 28,
    x: 29,
    y: 30,
    z: 31,
  };
  let result = 0;
  for (let i = 0; i < 4; i++) {
    result <<= 5;
    if (i < name.length) {
      result |= NAME_CHAR_TO_VALUE[name[i]];
    }
  }
  return result;
}

/** Build 128-bit TNID value from parts (mirrors bits.ts logic) */
function buildTnidValue(
  nameBits: number,
  payload: bigint,
  tnidVariant: bigint,
): bigint {
  const payloadA = (payload >> 72n) & ((1n << 28n) - 1n);
  const payloadB = (payload >> 60n) & ((1n << 12n) - 1n);
  const payloadC = payload & ((1n << 60n) - 1n);

  let value = BigInt(nameBits) & ((1n << 20n) - 1n);
  value = (value << 28n) | payloadA;
  value = (value << 4n) | 0x8n;
  value = (value << 12n) | payloadB;
  value = (value << 2n) | 0b10n;
  value = (value << 2n) | (tnidVariant & 0b11n);
  value = (value << 60n) | payloadC;

  return value;
}

/** Convert 128-bit value to UUID string format */
function valueToUuid(value: bigint): string {
  const hex = value.toString(16).padStart(32, "0");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${
    hex.slice(16, 20)
  }-${hex.slice(20)}`;
}

interface TraceResult {
  name: string;
  nameBits: number;
  payload: bigint;
  payloadA: bigint;
  payloadB: bigint;
  payloadC: bigint;
  tnidVariant: bigint;
  value128: bigint;
  uuid: string;
  tnid: string;
}

/** Trace V1 encoding step by step */
function traceV1Encoding(name: string, random: bigint): TraceResult {
  const nameBits = encodeName(name);
  const payload = random & ((1n << 100n) - 1n);
  const tnidVariant = 0b01n;

  const payloadA = (payload >> 72n) & ((1n << 28n) - 1n);
  const payloadB = (payload >> 60n) & ((1n << 12n) - 1n);
  const payloadC = payload & ((1n << 60n) - 1n);

  const value128 = buildTnidValue(nameBits, payload, tnidVariant);
  const uuid = valueToUuid(value128);

  const factory = Tnid(name as Parameters<typeof Tnid>[0]);
  const tnid = factory.v1_from_parts(random);

  return {
    name,
    nameBits,
    payload,
    payloadA,
    payloadB,
    payloadC,
    tnidVariant,
    value128,
    uuid,
    tnid,
  };
}

/** Trace V0 encoding step by step */
function traceV0Encoding(
  name: string,
  timestamp: bigint,
  random: bigint,
): TraceResult {
  const nameBits = encodeName(name);
  const ts = timestamp & ((1n << 43n) - 1n);
  const r = random & ((1n << 57n) - 1n);
  const payload = (ts << 57n) | r;
  const tnidVariant = 0b00n;

  const payloadA = (payload >> 72n) & ((1n << 28n) - 1n);
  const payloadB = (payload >> 60n) & ((1n << 12n) - 1n);
  const payloadC = payload & ((1n << 60n) - 1n);

  const value128 = buildTnidValue(nameBits, payload, tnidVariant);
  const uuid = valueToUuid(value128);

  const factory = Tnid(name as Parameters<typeof Tnid>[0]);
  const tnid = factory.v0_from_parts(timestamp, random);

  return {
    name,
    nameBits,
    payload,
    payloadA,
    payloadB,
    payloadC,
    tnidVariant,
    value128,
    uuid,
    tnid,
  };
}

// =============================================================================
// Diagnostic Tests
// =============================================================================

Deno.test("diagnostic: V1 max random - trace encoding steps", async () => {
  const name = "user";
  const random = (1n << 100n) - 1n;

  const trace = traceV1Encoding(name, random);
  const rustTnid = await cliMakeV1(name, random);
  const rustInspect = await cliInspect(rustTnid);

  console.log("\n=== V1 Max Random Diagnostic ===");
  console.log(`Input: name="${name}", random=0x${random.toString(16)}`);
  console.log(`\nTS Trace:`);
  console.log(`  nameBits: 0x${trace.nameBits.toString(16)}`);
  console.log(`  payload (100 bits): 0x${trace.payload.toString(16)}`);
  console.log(`  payloadA (28 bits): 0x${trace.payloadA.toString(16)}`);
  console.log(`  payloadB (12 bits): 0x${trace.payloadB.toString(16)}`);
  console.log(`  payloadC (60 bits): 0x${trace.payloadC.toString(16)}`);
  console.log(`  tnidVariant: ${trace.tnidVariant}`);
  console.log(`  value128: 0x${trace.value128.toString(16).padStart(32, "0")}`);
  console.log(`  uuid: ${trace.uuid}`);
  console.log(`  tnid: ${trace.tnid}`);
  console.log(`\nRust Output:`);
  console.log(`  tnid: ${rustTnid}`);
  console.log(`  uuid: ${rustInspect.uuidString}`);
  console.log(`\nComparison:`);
  console.log(`  TNID match: ${trace.tnid === rustTnid}`);
  console.log(`  UUID match: ${trace.uuid === rustInspect.uuidString}`);

  // Reverse-engineer what Rust computed
  const rustUuidHex = rustInspect.uuidString.replace(/-/g, "");
  const rustValue = BigInt("0x" + rustUuidHex);

  // Extract what Rust put in each field
  const rustNameBits = Number(rustValue >> 108n) & 0xfffff;
  const rustPayloadA = Number((rustValue >> 80n) & ((1n << 28n) - 1n));
  const rustUuidVer = Number((rustValue >> 76n) & 0xfn);
  const rustPayloadB = Number((rustValue >> 64n) & 0xfffn);
  const rustUuidVar = Number((rustValue >> 62n) & 0b11n);
  const rustTnidVar = Number((rustValue >> 60n) & 0b11n);
  const rustPayloadC = rustValue & ((1n << 60n) - 1n);

  console.log(`\nRust field extraction:`);
  console.log(
    `  nameBits: 0x${rustNameBits.toString(16)} (expected 0x${
      trace.nameBits.toString(16)
    })`,
  );
  console.log(
    `  payloadA: 0x${rustPayloadA.toString(16)} (TS has 0x${
      trace.payloadA.toString(16)
    })`,
  );
  console.log(`  uuid_ver: 0x${rustUuidVer.toString(16)}`);
  console.log(
    `  payloadB: 0x${rustPayloadB.toString(16)} (TS has 0x${
      trace.payloadB.toString(16)
    })`,
  );
  console.log(`  uuid_var: 0b${rustUuidVar.toString(2)}`);
  console.log(`  tnid_var: 0b${rustTnidVar.toString(2)}`);
  console.log(
    `  payloadC: 0x${rustPayloadC.toString(16)} (TS has 0x${
      trace.payloadC.toString(16)
    })`,
  );

  // What 100-bit payload would produce Rust's values?
  const rustPayload = (BigInt(rustPayloadA) << 72n) |
    (BigInt(rustPayloadB) << 60n) | rustPayloadC;
  console.log(`\nReconstructed Rust payload: 0x${rustPayload.toString(16)}`);
  console.log(`Input random was:           0x${random.toString(16)}`);

  assertEquals(trace.tnid, rustTnid, "TNID strings should match");
});

Deno.test("diagnostic: V1 small random - trace encoding steps", async () => {
  const name = "user";
  const random = 12345n;

  const trace = traceV1Encoding(name, random);
  const rustTnid = await cliMakeV1(name, random);
  const rustInspect = await cliInspect(rustTnid);

  console.log("\n=== V1 Small Random Diagnostic ===");
  console.log(`Input: name="${name}", random=0x${random.toString(16)}`);
  console.log(`\nTS Trace:`);
  console.log(`  nameBits: 0x${trace.nameBits.toString(16)}`);
  console.log(`  payload (100 bits): 0x${trace.payload.toString(16)}`);
  console.log(`  payloadA (28 bits): 0x${trace.payloadA.toString(16)}`);
  console.log(`  payloadB (12 bits): 0x${trace.payloadB.toString(16)}`);
  console.log(`  payloadC (60 bits): 0x${trace.payloadC.toString(16)}`);
  console.log(`  tnidVariant: ${trace.tnidVariant}`);
  console.log(`  value128: 0x${trace.value128.toString(16).padStart(32, "0")}`);
  console.log(`  uuid: ${trace.uuid}`);
  console.log(`  tnid: ${trace.tnid}`);
  console.log(`\nRust Output:`);
  console.log(`  tnid: ${rustTnid}`);
  console.log(`  uuid: ${rustInspect.uuidString}`);
  console.log(`\nComparison:`);
  console.log(`  TNID match: ${trace.tnid === rustTnid}`);
  console.log(`  UUID match: ${trace.uuid === rustInspect.uuidString}`);

  assertEquals(
    trace.uuid,
    rustInspect.uuidString,
    "UUID representations should match",
  );
  assertEquals(trace.tnid, rustTnid, "TNID strings should match");
});

Deno.test("diagnostic: V0 with timestamp - trace encoding steps", async () => {
  const name = "user";
  const timestamp = 1737903600000n;
  const random = 0n;

  const trace = traceV0Encoding(name, timestamp, random);
  const rustTnid = await cliMakeV0(name, timestamp, random);
  const rustInspect = await cliInspect(rustTnid);

  console.log("\n=== V0 Timestamp Diagnostic ===");
  console.log(
    `Input: name="${name}", ts=${timestamp}, random=0x${random.toString(16)}`,
  );
  console.log(`\nTS Trace:`);
  console.log(`  nameBits: 0x${trace.nameBits.toString(16)}`);
  console.log(`  payload (100 bits): 0x${trace.payload.toString(16)}`);
  console.log(`  payloadA (28 bits): 0x${trace.payloadA.toString(16)}`);
  console.log(`  payloadB (12 bits): 0x${trace.payloadB.toString(16)}`);
  console.log(`  payloadC (60 bits): 0x${trace.payloadC.toString(16)}`);
  console.log(`  tnidVariant: ${trace.tnidVariant}`);
  console.log(`  value128: 0x${trace.value128.toString(16).padStart(32, "0")}`);
  console.log(`  uuid: ${trace.uuid}`);
  console.log(`  tnid: ${trace.tnid}`);
  console.log(`\nRust Output:`);
  console.log(`  tnid: ${rustTnid}`);
  console.log(`  uuid: ${rustInspect.uuidString}`);
  console.log(`\nComparison:`);
  console.log(`  TNID match: ${trace.tnid === rustTnid}`);
  console.log(`  UUID match: ${trace.uuid === rustInspect.uuidString}`);

  assertEquals(
    trace.uuid,
    rustInspect.uuidString,
    "UUID representations should match",
  );
  assertEquals(trace.tnid, rustTnid, "TNID strings should match");
});

Deno.test("diagnostic: V0 with max timestamp - check if upper bits matter", async () => {
  const name = "user";
  const timestamp = (1n << 43n) - 1n; // Max 43-bit timestamp
  const random = (1n << 57n) - 1n; // Max 57-bit random

  const trace = traceV0Encoding(name, timestamp, random);
  const rustTnid = await cliMakeV0(name, timestamp, random);
  const rustInspect = await cliInspect(rustTnid);

  console.log("\n=== V0 Max Values Diagnostic ===");
  console.log(
    `Input: name="${name}", ts=0x${timestamp.toString(16)}, random=0x${
      random.toString(16)
    }`,
  );
  console.log(`\nTS Trace:`);
  console.log(`  payload (100 bits): 0x${trace.payload.toString(16)}`);
  console.log(`  payloadA (28 bits): 0x${trace.payloadA.toString(16)}`);
  console.log(`  payloadB (12 bits): 0x${trace.payloadB.toString(16)}`);
  console.log(`  payloadC (60 bits): 0x${trace.payloadC.toString(16)}`);
  console.log(`  uuid: ${trace.uuid}`);
  console.log(`  tnid: ${trace.tnid}`);
  console.log(`\nRust Output:`);
  console.log(`  tnid: ${rustTnid}`);
  console.log(`  uuid: ${rustInspect.uuidString}`);

  // Extract Rust's fields
  const rustUuidHex = rustInspect.uuidString.replace(/-/g, "");
  const rustValue = BigInt("0x" + rustUuidHex);
  const rustPayloadA = (rustValue >> 80n) & ((1n << 28n) - 1n);
  const rustPayloadB = (rustValue >> 64n) & 0xfffn;
  const rustPayloadC = rustValue & ((1n << 60n) - 1n);

  console.log(`\nRust field extraction:`);
  console.log(
    `  payloadA: 0x${rustPayloadA.toString(16)} (TS has 0x${
      trace.payloadA.toString(16)
    })`,
  );
  console.log(
    `  payloadB: 0x${rustPayloadB.toString(16)} (TS has 0x${
      trace.payloadB.toString(16)
    })`,
  );
  console.log(
    `  payloadC: 0x${rustPayloadC.toString(16)} (TS has 0x${
      trace.payloadC.toString(16)
    })`,
  );

  assertEquals(
    trace.uuid,
    rustInspect.uuidString,
    "UUID representations should match",
  );
  assertEquals(trace.tnid, rustTnid, "TNID strings should match");
});
