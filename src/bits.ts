// =============================================================================
// Bit Manipulation and TNID Generation
// Mask-based approach matching Rust implementation
// =============================================================================

// Masks for UUID version 8 and variant bits
export const UUID_V8_MASK = 0x00000000_0000_8000_8000_000000000000n;

// V1: 100 random bits scattered across the UUID
export const V1_RANDOM_MASK = 0x00000fff_ffff_0fff_0fff_ffffffffffffn;

// V0: 57 random bits in the lower portion
export const V0_RANDOM_MASK = 0x00000000_0000_0000_01ff_ffffffffffffn;

// V0 timestamp masks (for extracting and placing 43-bit timestamp)
const TIMESTAMP_FIRST_28_MASK = 0x0000_07ff_ffff_8000n;
const TIMESTAMP_SECOND_12_MASK = 0x0000_0000_0000_7ff8n;
const TIMESTAMP_LAST_3_MASK = 0x0000_0000_0000_0007n;

/** Place name bits in their correct position (bits 108-127) */
export function nameMask(nameBits: number): bigint {
  return BigInt(nameBits) << 108n;
}

/** Place UUID version/variant and TNID variant in their correct positions */
export function uuidAndVariantMask(tnidVariant: bigint): bigint {
  return UUID_V8_MASK | ((tnidVariant & 0b11n) << 60n);
}

/** Scatter 43-bit timestamp into its three positions within the 128-bit ID */
export function millisMask(millisSinceEpoch: bigint): bigint {
  let mask = 0n;

  // First 28 bits of timestamp → bits 80-107 of UUID
  const first28LeadingZeros = 64n - 43n; // = 21, so mask starts at bit 42
  mask |= (millisSinceEpoch & TIMESTAMP_FIRST_28_MASK) <<
    (first28LeadingZeros + 64n - 20n);

  // Middle 12 bits of timestamp → bits 64-75 of UUID (after version nibble)
  const second12LeadingZeros = 64n - 15n; // = 49
  mask |= (millisSinceEpoch & TIMESTAMP_SECOND_12_MASK) <<
    (second12LeadingZeros + 64n - 52n);

  // Last 3 bits of timestamp → bits 57-59 of UUID (after variant bits)
  const last3LeadingZeros = 64n - 3n; // = 61
  mask |= (millisSinceEpoch & TIMESTAMP_LAST_3_MASK) <<
    (last3LeadingZeros + 64n - 68n);

  return mask;
}

/** Build a 128-bit TNID value using mask-based OR operations */
export function buildTnidValue(
  nameBits: number,
  payloadMask: bigint,
  tnidVariant: bigint,
): bigint {
  return nameMask(nameBits) | uuidAndVariantMask(tnidVariant) | payloadMask;
}

/** Convert 128-bit value to byte array */
export function valueToBytes(value: bigint): Uint8Array {
  const bytes = new Uint8Array(16);
  let v = value;
  for (let i = 15; i >= 0; i--) {
    bytes[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return bytes;
}

/** Generate a V0 (time-ordered) TNID as bytes */
export function generateV0(
  nameBits: number,
  timestampMs?: bigint,
  randomBits?: bigint,
): Uint8Array {
  const timestamp = timestampMs !== undefined
    ? timestampMs & ((1n << 43n) - 1n)
    : BigInt(Date.now()) & ((1n << 43n) - 1n);

  let random: bigint;
  if (randomBits !== undefined) {
    random = randomBits;
  } else {
    const randomBytes = crypto.getRandomValues(new Uint8Array(8));
    random = 0n;
    for (const byte of randomBytes) {
      random = (random << 8n) | BigInt(byte);
    }
  }

  const payloadMask = millisMask(timestamp) | (random & V0_RANDOM_MASK);
  const value = buildTnidValue(nameBits, payloadMask, 0b00n);
  return valueToBytes(value);
}

/** Generate a V1 (high-entropy random) TNID as bytes */
export function generateV1(nameBits: number, randomBits?: bigint): Uint8Array {
  let random: bigint;
  if (randomBits !== undefined) {
    random = randomBits;
  } else {
    const randomBytes = crypto.getRandomValues(new Uint8Array(16));
    random = 0n;
    for (const byte of randomBytes) {
      random = (random << 8n) | BigInt(byte);
    }
  }

  const payloadMask = random & V1_RANDOM_MASK;
  const value = buildTnidValue(nameBits, payloadMask, 0b01n);
  return valueToBytes(value);
}
