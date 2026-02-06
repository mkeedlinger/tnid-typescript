// =============================================================================
// Name Encoding - 5-bit encoding for TNID names
// Valid characters: 0-4, a-z (31 chars + null terminator = 32 = 2^5)
// =============================================================================

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

const NAME_VALUE_TO_CHAR: Record<number, string> = {};
for (const [char, value] of Object.entries(NAME_CHAR_TO_VALUE)) {
  NAME_VALUE_TO_CHAR[value] = char;
}

const VALID_NAME_CHARS = new Set("01234abcdefghijklmnopqrstuvwxyz".split(""));

/**
 * Encode a name into 20 bits (4 chars * 5 bits each).
 * Null-pads on the right (least significant bits).
 */
export function encodeName(name: string): number {
  let result = 0;
  for (let i = 0; i < 4; i++) {
    result <<= 5;
    if (i < name.length) {
      const value = NAME_CHAR_TO_VALUE[name[i]];
      if (value === undefined) {
        throw new Error(`Invalid name character: ${name[i]}`);
      }
      result |= value;
    }
    // else: null (0) is already the default
  }
  return result;
}

/**
 * Decode 20 bits back to a name string.
 */
export function decodeName(encoded: number): string {
  let result = "";
  for (let i = 0; i < 4; i++) {
    const shift = (3 - i) * 5;
    const value = (encoded >> shift) & 0x1f;
    if (value === 0) {
      // Verify remaining slots are also null
      for (let j = i + 1; j < 4; j++) {
        const nextShift = (3 - j) * 5;
        if ((encoded >> nextShift) & 0x1f) {
          throw new Error(
            `Invalid name encoding: non-null value after null terminator`,
          );
        }
      }
      break;
    }
    const char = NAME_VALUE_TO_CHAR[value];
    if (!char) {
      throw new Error(`Invalid encoded name value: ${value}`);
    }
    result += char;
  }
  return result;
}

/**
 * Validate a name at runtime.
 * Must be 1-4 characters, each being 0-4 or a-z.
 */
export function isValidNameRuntime(name: string): boolean {
  if (name.length < 1 || name.length > 4) return false;
  for (const char of name) {
    if (!VALID_NAME_CHARS.has(char)) return false;
  }
  return true;
}
