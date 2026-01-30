# @tnid/wasm

Drop-in replacement for `@tnid/core` powered by the Rust reference implementation via WebAssembly.

All ID generation, parsing, and conversion is performed by the same Rust code
that powers the `tnid` crate, compiled to WebAssembly. You get the exact same
behavior as the reference implementation with TypeScript's compile-time type
safety.

## Installation

```bash
# npm
npm install @tnid/wasm

# pnpm
pnpm add @tnid/wasm

# bun
bun add @tnid/wasm

# deno
deno add npm:@tnid/wasm
```

## Platform Support

- Node.js 20+
- Deno 1.0+
- Bun 1.0+
- Modern browsers (ES2020+)

## Quick Start

```typescript
import { init, DynamicTnid, Tnid, TnidType } from "@tnid/wasm";

// Initialize WASM (required once before using any functions)
await init();

// Create a typed NamedTnid (compile-time name validation)
const UserId = Tnid("user");
type UserId = TnidType<typeof UserId>;

// Generate IDs
const id: UserId = UserId.new_v0(); // time-ordered
const id2: UserId = UserId.new_v1(); // high-entropy random

// IDs look like: "user.Br2flcNDfF6LYICnT"
console.log(id);

// Parse existing IDs
const parsed: UserId = UserId.parse("user.Br2flcNDfF6LYICnT");

// Convert to/from UUID format
const uuid: string = UserId.toUuidString(id); // "d6157329-4640-8e30-..."
const fromUuid: UserId = UserId.parseUuidString(uuid);

// Works great with Zod
import { z } from "zod";
const UserSchema = z.object({
  id: z.string().transform(UserId.parse),
  name: z.string(),
});
interface User extends z.infer<typeof UserSchema> {} // { id: UserId; name: string }

const user: User = UserSchema.parse({
  id: "user.Br2flcNDfF6LYICnT",
  name: "Alice",
});
```

## Features

- **Rust reference implementation**: All operations use the same code as the
  `tnid` Rust crate, compiled to WebAssembly
- **Drop-in replacement**: Same API as `@tnid/core` (just add `await init()`)
- **Compile-time type safety**: Different TNID types are incompatible at the
  type level
- **Human-readable prefixes**: IDs like `user.Br2flcNDfF6LYICnT` are
  self-documenting
- **UUID compatible**: Store in any UUID column, use with existing UUID tooling
- **Time-ordered (V0)**: Sortable by creation time, like UUIDv7
- **High-entropy (V1)**: Maximum randomness, like UUIDv4
- **String-backed**: At runtime, TNIDs are their string representation
- **Encryption included**: V0/V1 format-preserving encryption built-in

```typescript
const id = UserId.new_v0();

// Use as Map key
const cache = new Map<UserId, User>();
cache.set(id, user);

// JSON serialization works naturally
JSON.stringify({ userId: id }); // {"userId":"user.Br2flcNDfF6LYICnT"}

// String comparison
id === otherUserId; // true/false
```

## API Reference

### Initialization

```typescript
import { init } from "@tnid/wasm";

// Must be called once before using any other functions
await init();
```

### Exports

```typescript
import {
  init, // Initialize WASM module (required)
  Tnid, // NamedTnid creator function
  DynamicTnid, // Runtime TNID operations (type + namespace)
  TnidType, // Type helper to extract ID type
  // Encryption
  EncryptionKey, // Encryption key wrapper
  encryptV0ToV1, // Encrypt V0 to V1
  decryptV1ToV0, // Decrypt V1 back to V0
  // Types only (re-exported from @tnid/core):
  Case, // "lower" | "upper"
  NamedTnid, // NamedTnid interface
  TnidValue, // Branded string type
  TnidVariant, // "v0" | "v1" | "v2" | "v3"
  ValidateName, // Compile-time name validation (for library authors)
} from "@tnid/wasm";
```

### `Tnid(name)`

Creates a `NamedTnid` for a specific name. The name is validated at **compile
time**.

```typescript
const UserId = Tnid("user");
const PostId = Tnid("post");
const ItemId = Tnid("item");
```

#### Name Rules

- 1-4 characters
- Only `0-4` and `a-z` (31 characters total)
- Lowercase only

```typescript
// Valid names
Tnid("user"); // OK
Tnid("a"); // OK
Tnid("1234"); // OK
Tnid("a1b2"); // OK

// Compile errors
Tnid("users"); // too long (max 4)
Tnid("User"); // uppercase not allowed
Tnid("a-b"); // hyphen not allowed
Tnid("5"); // only digits 0-4
Tnid(""); // empty not allowed
```

### `NamedTnid<Name>` (returned by `Tnid()`)

#### Generation

```typescript
const UserId = Tnid("user");
type UserId = TnidType<typeof UserId>;

UserId.new_v0(); // time-ordered ID
UserId.new_v1(); // high-entropy random ID
UserId.v0_from_parts(1234567890n, 0n); // V0 with explicit timestamp/random
UserId.v1_from_parts(0n); // V1 with explicit random bits
```

#### Parsing

```typescript
UserId.parse("user.Br2flcNDfF6LYICnT"); // parse TNID or UUID string
UserId.parseTnidString("user.Br2flcNDfF6LYICnT"); // parse TNID string only
UserId.parseUuidString("d6157329-4640-8e30-..."); // parse UUID hex string
```

#### Inspection and Conversion

```typescript
UserId.name; // "user" - the TNID name
UserId.variant(id); // "v0" or "v1" - get the variant
UserId.toUuidString(id); // "d6157329-4640-8e30-..." - convert to UUID
UserId.toUuidString(id, "upper"); // "D6157329-4640-8E30-..." - uppercase UUID
UserId.nameHex(); // "d6157" - name as 5-char hex
```

### `TnidType<T>`

Type helper to extract the `TnidValue` type from a `NamedTnid`.

```typescript
const UserId = Tnid("user");
type UserId = TnidType<typeof UserId>;  // TnidValue<"user">

const PostId = Tnid("post");
type PostId = TnidType<typeof PostId>;  // TnidValue<"post">

// Use in function signatures
function getUser(id: UserId): User { ... }
function getPost(id: PostId): Post { ... }
```

### `DynamicTnid`

For working with TNIDs when the name isn't known at compile time.

```typescript
// As a type - accepts any TNID
function logAnyId(id: DynamicTnid) {
  console.log(DynamicTnid.getName(id), id);
}

// Generation with runtime names
DynamicTnid.new_v0("user"); // time-ordered
DynamicTnid.new_v1("user"); // high-entropy

// Parsing (auto-detects format)
DynamicTnid.parse("post.EUBcUw4T9x3KNOll-"); // TNID string
DynamicTnid.parseUuidString("d6157329-4640-..."); // UUID string

// Inspection
DynamicTnid.getName(id); // "user"
DynamicTnid.getVariant(id); // "v0" or "v1"
DynamicTnid.toUuidString(id); // UUID hex string
DynamicTnid.isValidName("user"); // true
```

## Variants

### V0 (Time-Ordered)

- 43 bits: millisecond timestamp
- 57 bits: random
- **Use case**: When you need chronological sorting (logs, events, feeds)

### V1 (High-Entropy)

- 100 bits: random
- **Use case**: When you need maximum uniqueness/unpredictability

## Type Safety

Different TNID types are completely incompatible at compile time:

```typescript
const UserId = Tnid("user");
const PostId = Tnid("post");
type UserId = TnidType<typeof UserId>;
type PostId = TnidType<typeof PostId>;

const userId: UserId = UserId.new_v0();
const postId: PostId = PostId.new_v0();

// Compile errors - types don't match
const wrong1: UserId = postId;           // Error
const wrong2: PostId = userId;           // Error
function getUser(id: UserId) { ... }
getUser(postId);                         // Error

// DynamicTnid accepts any TNID
const dynamic: DynamicTnid = userId;     // OK
const dynamic2: DynamicTnid = postId;    // OK
```

Plain strings cannot be assigned to TNID types:

```typescript
// Compile errors - plain strings not allowed
const fake: UserId = "user.Br2flcNDfF6LYICnT"; // Error

// Must use parse() or new_*() to get a valid TNID
const valid: UserId = UserId.parse("user.Br2flcNDfF6LYICnT"); // OK
```

## UUID Compatibility

TNIDs are valid UUIDv8 identifiers:

```typescript
const id = UserId.new_v0();

// To UUID
const uuid = UserId.toUuidString(id);
// "d6157329-4640-8e30-8012-345678901234"

// From UUID
const back = UserId.parseUuidString(uuid);

// Store in database as UUID
await db.query("INSERT INTO users (id) VALUES ($1)", [uuid]);
```

## Encryption

Format-preserving encryption is built-in (no separate package needed):

```typescript
import { init, Tnid, EncryptionKey, encryptV0ToV1, decryptV1ToV0 } from "@tnid/wasm";

await init();

const UserId = Tnid("user");
const key = EncryptionKey.fromHex("0102030405060708090a0b0c0d0e0f10");

const v0 = UserId.new_v0();
const v1 = encryptV0ToV1(v0, key); // Encrypt to hide timestamp
const back = decryptV1ToV0(v1, key); // Decrypt to recover original
```

### `EncryptionKey`

- `EncryptionKey.fromHex(hex)` - Create from 32-char hex string (16 bytes)
- `EncryptionKey.fromBytes(bytes)` - Create from 16-byte Uint8Array

### `encryptV0ToV1(tnid, key)`

Encrypt a V0 TNID to V1 format. The result looks random but can be decrypted.

### `decryptV1ToV0(tnid, key)`

Decrypt a V1 TNID back to V0 format.

## License

MIT
