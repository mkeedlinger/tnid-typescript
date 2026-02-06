/**
 * FF1 tests including NIST SP 800-38G test vectors.
 */

import { assertEquals } from "@std/assert";
import { FF1 } from "../src/ff1.ts";

// NIST FF1 Test Vectors from SP 800-38G
// https://csrc.nist.gov/CSRC/media/Projects/Cryptographic-Standards-and-Guidelines/documents/examples/FF1samples.pdf

Deno.test("FF1: NIST Sample 1 - radix 10, empty tweak", async () => {
  // Key: 2B7E151628AED2A6ABF7158809CF4F3C
  const key = new Uint8Array([
    0x2b,
    0x7e,
    0x15,
    0x16,
    0x28,
    0xae,
    0xd2,
    0xa6,
    0xab,
    0xf7,
    0x15,
    0x88,
    0x09,
    0xcf,
    0x4f,
    0x3c,
  ]);

  const ff1 = new FF1(key, 10);
  const tweak = new Uint8Array(0);

  // Plaintext: 0123456789 (as digits)
  const plaintext = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

  // Expected ciphertext: 2433477484
  const expected = [2, 4, 3, 3, 4, 7, 7, 4, 8, 4];

  const ciphertext = await ff1.encrypt(tweak, plaintext);
  assertEquals(ciphertext, expected, "Encryption should match NIST vector");

  const decrypted = await ff1.decrypt(tweak, ciphertext);
  assertEquals(decrypted, plaintext, "Decryption should recover plaintext");
});

Deno.test("FF1: NIST Sample 2 - radix 10, with tweak", async () => {
  // Same key as Sample 1
  const key = new Uint8Array([
    0x2b,
    0x7e,
    0x15,
    0x16,
    0x28,
    0xae,
    0xd2,
    0xa6,
    0xab,
    0xf7,
    0x15,
    0x88,
    0x09,
    0xcf,
    0x4f,
    0x3c,
  ]);

  const ff1 = new FF1(key, 10);

  // Tweak: 39383736353433323130 (ASCII "9876543210")
  const tweak = new Uint8Array([
    0x39,
    0x38,
    0x37,
    0x36,
    0x35,
    0x34,
    0x33,
    0x32,
    0x31,
    0x30,
  ]);

  // Plaintext: 0123456789 (as digits)
  const plaintext = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

  // Expected ciphertext: 6124200773
  const expected = [6, 1, 2, 4, 2, 0, 0, 7, 7, 3];

  const ciphertext = await ff1.encrypt(tweak, plaintext);
  assertEquals(ciphertext, expected, "Encryption should match NIST vector");

  const decrypted = await ff1.decrypt(tweak, ciphertext);
  assertEquals(decrypted, plaintext, "Decryption should recover plaintext");
});

Deno.test("FF1: NIST Sample 3 - radix 36", async () => {
  // Key: 2B7E151628AED2A6ABF7158809CF4F3C
  const key = new Uint8Array([
    0x2b,
    0x7e,
    0x15,
    0x16,
    0x28,
    0xae,
    0xd2,
    0xa6,
    0xab,
    0xf7,
    0x15,
    0x88,
    0x09,
    0xcf,
    0x4f,
    0x3c,
  ]);

  const ff1 = new FF1(key, 36);

  // Tweak: 3737373770717273373737 (binary representation)
  const tweak = new Uint8Array([
    0x37,
    0x37,
    0x37,
    0x37,
    0x70,
    0x71,
    0x72,
    0x73,
    0x37,
    0x37,
    0x37,
  ]);

  // Plaintext: 0123456789abcdefghi (as base-36 digits)
  // 0-9 map to 0-9, a-z map to 10-35
  const plaintext = [
    0,
    1,
    2,
    3,
    4,
    5,
    6,
    7,
    8,
    9,
    10,
    11,
    12,
    13,
    14,
    15,
    16,
    17,
    18,
  ];

  // Expected ciphertext: a9tv40mll9kdu509eum
  // a=10, 9=9, t=29, v=31, 4=4, 0=0, m=22, l=21, l=21, 9=9, k=20, d=13, u=30, 5=5, 0=0, 9=9, e=14, u=30, m=22
  const expected = [
    10,
    9,
    29,
    31,
    4,
    0,
    22,
    21,
    21,
    9,
    20,
    13,
    30,
    5,
    0,
    9,
    14,
    30,
    22,
  ];

  const ciphertext = await ff1.encrypt(tweak, plaintext);
  assertEquals(ciphertext, expected, "Encryption should match NIST vector");

  const decrypted = await ff1.decrypt(tweak, ciphertext);
  assertEquals(decrypted, plaintext, "Decryption should recover plaintext");
});

Deno.test("FF1: radix 16 round-trip", async () => {
  // Test with radix 16 (hex) which is what TNID encryption uses
  const key = new Uint8Array([
    0x01,
    0x02,
    0x03,
    0x04,
    0x05,
    0x06,
    0x07,
    0x08,
    0x09,
    0x0a,
    0x0b,
    0x0c,
    0x0d,
    0x0e,
    0x0f,
    0x10,
  ]);

  const ff1 = new FF1(key, 16);
  const tweak = new Uint8Array(0);

  // 25 hex digits (100 bits, like TNID Payload)
  const plaintext = [
    0,
    1,
    2,
    3,
    4,
    5,
    6,
    7,
    8,
    9,
    10,
    11,
    12,
    13,
    14,
    15,
    0,
    1,
    2,
    3,
    4,
    5,
    6,
    7,
    8,
  ];

  const ciphertext = await ff1.encrypt(tweak, plaintext);

  // Ciphertext should be different from plaintext
  const isDifferent = plaintext.some((v, i) => v !== ciphertext[i]);
  assertEquals(isDifferent, true, "Ciphertext should differ from plaintext");

  // Should round-trip correctly
  const decrypted = await ff1.decrypt(tweak, ciphertext);
  assertEquals(decrypted, plaintext, "Decryption should recover plaintext");
});

Deno.test("FF1: different keys produce different results", async () => {
  const key1 = new Uint8Array([
    0x01,
    0x02,
    0x03,
    0x04,
    0x05,
    0x06,
    0x07,
    0x08,
    0x09,
    0x0a,
    0x0b,
    0x0c,
    0x0d,
    0x0e,
    0x0f,
    0x10,
  ]);
  const key2 = new Uint8Array([
    0x01,
    0x02,
    0x03,
    0x04,
    0x05,
    0x06,
    0x07,
    0x08,
    0x09,
    0x0a,
    0x0b,
    0x0c,
    0x0d,
    0x0e,
    0x0f,
    0x11, // Different last byte
  ]);

  const ff1_1 = new FF1(key1, 10);
  const ff1_2 = new FF1(key2, 10);
  const tweak = new Uint8Array(0);
  const plaintext = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

  const ct1 = await ff1_1.encrypt(tweak, plaintext);
  const ct2 = await ff1_2.encrypt(tweak, plaintext);

  const isDifferent = ct1.some((v, i) => v !== ct2[i]);
  assertEquals(
    isDifferent,
    true,
    "Different keys should produce different ciphertexts",
  );
});
