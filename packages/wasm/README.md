# @tnid/wasm

WebAssembly implementation of TNID, compiled from Rust for high performance.

Provides the same API as `@tnid/core` but uses a WASM backend. Includes
encryption support built-in.

## Installation

```bash
npm install @tnid/wasm
```

## Usage

```typescript
import { init, Tnid, type TnidType } from "@tnid/wasm";

// Initialize WASM (required once before using any functions)
await init();

// Create a typed TNID factory
const UserId = Tnid("user");
type UserId = TnidType<typeof UserId>;

// Generate IDs
const id: UserId = UserId.new_v0(); // time-ordered
const id2: UserId = UserId.new_v1(); // high-entropy random

console.log(id); // "user.Br2flcNDfF6LYICnT"
```

## Encryption

Encryption is included (no separate package needed):

```typescript
import { init, Tnid, EncryptionKey, encryptV0ToV1, decryptV1ToV0 } from "@tnid/wasm";

await init();

const UserId = Tnid("user");
const key = EncryptionKey.fromHex("0102030405060708090a0b0c0d0e0f10");

const v0 = UserId.new_v0();
const v1 = encryptV0ToV1(v0, key); // Encrypt to hide timestamp
const back = decryptV1ToV0(v1, key); // Decrypt to recover original
```

## API

### `init(): Promise<void>`

Initialize the WASM module. Must be called once before using any other functions.

### `Tnid(name)`

Creates a typed TNID factory (same as `@tnid/core`).

### `DynamicTnid`

Runtime TNID operations (same as `@tnid/core`).

### `EncryptionKey`

- `EncryptionKey.fromHex(hex)` - Create from 32-char hex string
- `EncryptionKey.fromBytes(bytes)` - Create from 16-byte Uint8Array

### `encryptV0ToV1(tnid, key)`

Encrypt a V0 TNID to V1 format.

### `decryptV1ToV0(tnid, key)`

Decrypt a V1 TNID back to V0 format.

## Platform Support

- Node.js 20+
- Deno 1.0+
- Modern browsers (ES2020+)

## License

MIT
