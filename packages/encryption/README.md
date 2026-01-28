# @tnid/encryption

Format-preserving encryption for TNIDs - convert time-ordered V0 IDs to random-looking V1 IDs and back.

This package provides FF1 (NIST SP 800-38G) format-preserving encryption to hide the timestamp information in V0 TNIDs while maintaining reversibility. Encrypted IDs are indistinguishable from random V1 IDs.

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

// Create a TNID factory
const UserId = Tnid("user");
type UserId = TnidType<typeof UserId>;

// Create an encryption key (16 bytes / 128 bits)
const key = EncryptionKey.fromHex("0102030405060708090a0b0c0d0e0f10");

// Generate a time-ordered V0 ID
const v0Id = UserId.new_v0();
console.log(v0Id); // "user.Br2flcNDfF6LYICnT" (contains timestamp)

// Encrypt to V1 (hides timestamp, looks random)
const v1Id = await encryptV0ToV1(v0Id, key);
console.log(v1Id); // "user.X3Wxwp0wOy4OZp_rP" (random-looking)

// Decrypt back to V0 (recovers timestamp)
const decrypted = await decryptV1ToV0(v1Id, key);
console.log(decrypted === v0Id); // true
```

## Use Cases

### Hide Creation Time from Users

Expose random-looking IDs externally while keeping time-ordered IDs internally:

```typescript
// Internal: time-ordered for efficient database queries
const internalId = UserId.new_v0();

// External: encrypted ID hides when the user was created
const externalId = await encryptV0ToV1(internalId, key);

// API returns encrypted ID
res.json({ id: externalId, name: user.name });

// When receiving ID from client, decrypt for internal use
const receivedId = await decryptV1ToV0(req.params.id, key);
```

### Prevent ID Enumeration

V0 IDs are sequential and predictable. Encryption prevents attackers from guessing valid IDs:

```typescript
// Without encryption: user.Br2flcN... -> user.Br2flcO... (predictable)
// With encryption: user.X3Wxwp0... -> user.qjrH3l_... (unpredictable)
```

## API Reference

### `EncryptionKey`

A 128-bit (16 byte) encryption key for TNID encryption.

```typescript
// From 32-character hex string
const key = EncryptionKey.fromHex("0102030405060708090a0b0c0d0e0f10");

// From raw bytes
const key = EncryptionKey.fromBytes(new Uint8Array(16));

// Get key bytes (returns a copy)
const bytes: Uint8Array = key.asBytes();
```

### `encryptV0ToV1(tnid, key)`

Encrypts a V0 TNID to V1, hiding timestamp information.

```typescript
const v1 = await encryptV0ToV1("user.Br2flcNDfF6LYICnT", key);
// Returns: "user.X3Wxwp0wOy4OZp_rP"
```

- **Input**: V0 TNID string
- **Output**: V1 TNID string (same name, encrypted payload)
- **Idempotent**: If input is already V1, returns it unchanged
- **Throws**: `EncryptionError` if input is invalid or unsupported variant

### `decryptV1ToV0(tnid, key)`

Decrypts a V1 TNID back to V0, recovering timestamp information.

```typescript
const v0 = await decryptV1ToV0("user.X3Wxwp0wOy4OZp_rP", key);
// Returns: "user.Br2flcNDfF6LYICnT"
```

- **Input**: V1 TNID string (encrypted)
- **Output**: V0 TNID string (original with timestamp)
- **Idempotent**: If input is already V0, returns it unchanged
- **Throws**: `EncryptionError` if input is invalid or unsupported variant

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

// EncryptionError - encryption/decryption failed
try {
  await encryptV0ToV1("invalid-tnid", key);
} catch (e) {
  if (e instanceof EncryptionError) {
    console.log("Encryption failed:", e.message);
  }
}
```

## Security Notes

- Uses AES-128 with FF1 mode (NIST SP 800-38G)
- 10 Feistel rounds for cryptographic security
- Format-preserving: output has same structure as input
- Key must be kept secret - same key encrypts and decrypts
- Compatible with Rust TNID implementation (bit-for-bit identical output)

## Key Management

Generate a secure random key:

```typescript
// Generate 16 random bytes
const keyBytes = new Uint8Array(16);
crypto.getRandomValues(keyBytes);
const key = EncryptionKey.fromBytes(keyBytes);

// Convert to hex for storage
const hex = Array.from(key.asBytes())
  .map((b) => b.toString(16).padStart(2, "0"))
  .join("");
```

Store the key securely (environment variable, secrets manager, etc.):

```typescript
const key = EncryptionKey.fromHex(process.env.TNID_ENCRYPTION_KEY!);
```

## License

MIT
