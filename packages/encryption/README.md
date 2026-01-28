# @tnid/encryption

Encrypt V0 TNIDs to V1 to hide timestamp information.

## Why Encrypt TNIDs?

V0 TNIDs contain a timestamp (like UUIDv7), which reveals when the ID was created. This can leak information you may not want to expose publicly, such as:

- When a user account was created
- The order in which records were created
- Approximate creation rates

By encrypting V0 to V1, you get a valid high-entropy V1 TNID that hides this information while remaining decryptable on the backend.

## Installation

```bash
# npm
npm install @tnid/encryption @tnid/core

# pnpm
pnpm add @tnid/encryption @tnid/core

# bun
bun add @tnid/encryption @tnid/core

# deno
deno add npm:@tnid/encryption npm:@tnid/core
```

## Platform Support

Requires `globalThis.crypto` (Web Crypto API):

- Node.js 20+
- Deno 1.0+
- Bun 1.0+
- Modern browsers (ES2020+)

## Quick Start

```typescript
import { Tnid, TnidType } from "@tnid/core";
import { EncryptionKey, encryptV0ToV1, decryptV1ToV0 } from "@tnid/encryption";

const UserId = Tnid("user");
type UserId = TnidType<typeof UserId>;

// Create an encryption key (16 bytes / 128 bits)
const key = EncryptionKey.fromHex("0102030405060708090a0b0c0d0e0f10");

// Create a time-ordered V0 ID
const v0 = UserId.new_v0();

// Encrypt to V1 before sending to client
const v1 = await encryptV0ToV1(v0, key);

// Decrypt on the backend to recover the original
const decrypted = await decryptV1ToV0(v1, key);
// decrypted === v0
```

## How It Works

The encryption converts the 100 payload bits while preserving the TNID structure. The result is a valid V1 TNID that is indistinguishable from a randomly generated one.

## API Reference

### `EncryptionKey`

A 128-bit (16 byte) encryption key.

```typescript
// From 32-character hex string
const key = EncryptionKey.fromHex("0102030405060708090a0b0c0d0e0f10");

// From raw bytes
const key = EncryptionKey.fromBytes(
  new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16])
);

// Get key bytes (returns a copy)
const bytes: Uint8Array = key.asBytes();
```

### `encryptV0ToV1(tnid, key)`

Encrypts a V0 TNID to V1, hiding timestamp information.

```typescript
const v0: UserId = UserId.new_v0();
const v1: UserId = await encryptV0ToV1(v0, key); // Type preserved!
```

- **Input**: V0 TNID (any typed TNID or `DynamicTnid`)
- **Output**: V1 TNID (same type as input)
- **Idempotent**: If input is already V1, returns it unchanged
- **Throws**: `EncryptionError` if variant is unsupported (v2/v3)

### `decryptV1ToV0(tnid, key)`

Decrypts a V1 TNID back to V0, recovering timestamp information.

```typescript
const decrypted: UserId = await decryptV1ToV0(v1, key); // Type preserved!
```

- **Input**: V1 TNID (any typed TNID or `DynamicTnid`)
- **Output**: V0 TNID (same type as input)
- **Idempotent**: If input is already V0, returns it unchanged
- **Throws**: `EncryptionError` if variant is unsupported (v2/v3)

### Error Classes

```typescript
import { EncryptionKeyError, EncryptionError } from "@tnid/encryption";

// EncryptionKeyError - invalid key format
try {
  EncryptionKey.fromHex("invalid");
} catch (e) {
  if (e instanceof EncryptionKeyError) {
    console.log("Invalid key:", e.message);
  }
}
```

## Implementation Details

Uses FF1 format-preserving encryption (NIST SP 800-38G) with AES-128, which allows encrypting the 100 payload bits while maintaining the exact same bit length. This implementation is bit-compatible with the Rust TNID library.

## Note

The encryption functionality is not part of the TNID specification. Encrypted TNIDs are standard V1 TNIDs and remain fully compatible with any TNID implementation.

## License

MIT
