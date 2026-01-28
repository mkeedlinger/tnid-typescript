# @tnid/core

Type-safe, named, unique identifiers (TNIDs) for TypeScript.

TNIDs are UUID-compatible identifiers with embedded type names, providing
compile-time type safety and human-readable prefixes.

## Installation

```bash
# npm
npm install @tnid/core

# pnpm
pnpm add @tnid/core

# bun
bun add @tnid/core

# deno
deno add npm:@tnid/core
```

## Platform Support

Requires `globalThis.crypto` (Web Crypto API):

- Node.js 20+
- Deno 1.0+
- Bun 1.0+
- Modern browsers (ES2020+)

## Quick Start

```typescript
import { DynamicTnid, Tnid, TnidType, UuidLike } from "@tnid/core";

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
```

## Features

- **Compile-time type safety**: Different TNID types are incompatible at the
  type level
- **Human-readable prefixes**: IDs like `user.Br2flcNDfF6LYICnT` are
  self-documenting
- **UUID compatible**: Store in any UUID column, use with existing UUID tooling
- **Time-ordered (V0)**: Sortable by creation time, like UUIDv7
- **High-entropy (V1)**: Maximum randomness, like UUIDv4
- **String-backed**: At runtime, TNIDs are their string representation

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

### Exports

```typescript
import {
  Case, // "lower" | "upper"
  DynamicTnid, // Runtime TNID operations (type + namespace)
  Tnid, // NamedTnid creator function
  NamedTnid, // NamedTnid interface
  TnidType, // Type helper to extract ID type
  // Types only:
  TnidValue, // Branded string type
  TnidVariant, // "v0" | "v1" | "v2" | "v3"
  UuidLike, // UUID string operations (type + namespace)
} from "@tnid/core";
```

### `Tnid(name)`

Creates a `NamedTnid` for a specific name. The name is validated at
**compile time**.

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

UserId.new_v0();                        // time-ordered ID
UserId.new_v1();                        // high-entropy random ID
UserId.v0_from_parts(1234567890n, 0n);  // V0 with explicit timestamp/random
UserId.v1_from_parts(0n);               // V1 with explicit random bits
```

#### Parsing

```typescript
UserId.parse("user.Br2flcNDfF6LYICnT");              // parse TNID string
UserId.parseUuidString("d6157329-4640-8e30-...");    // parse UUID hex string
```

#### Inspection and Conversion

```typescript
UserId.name;                      // "user" - the TNID name
UserId.variant(id);               // "v0" or "v1" - get the variant
UserId.toUuidString(id);          // "d6157329-4640-8e30-..." - convert to UUID
UserId.toUuidString(id, "upper"); // "D6157329-4640-8E30-..." - uppercase UUID
UserId.nameHex();                 // "d6157" - name as 5-char hex
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
DynamicTnid.new_v0("user");           // time-ordered (alias: new_time_ordered)
DynamicTnid.new_v1("user");           // high-entropy (alias: new_high_entropy)

// Generation with explicit values (useful for testing/migrations)
DynamicTnid.new_v0_with_time("user", new Date("2024-01-15"));
DynamicTnid.new_v0_with_parts("user", 1705312800000n, 123n);
DynamicTnid.new_v1_with_random("user", 0x123456789abcdef0123456789n);

// Parsing any TNID
DynamicTnid.parse("post.EUBcUw4T9x3KNOll-");
DynamicTnid.parse_uuid_string("d6157329-4640-...");

// Inspection
DynamicTnid.getName(id);              // "user"
DynamicTnid.getNameHex(id);           // "d6157"
DynamicTnid.getVariant(id);           // "v0" or "v1"
DynamicTnid.toUuidString(id);         // UUID hex string
```

### `UuidLike`

For working with UUID hex strings that may or may not be valid TNIDs.

```typescript
UuidLike.fromTnid(id);        // convert TNID to UUID string
UuidLike.parse(s);            // parse any UUID (validates format only)
UuidLike.toTnid(uuid);        // convert UUID to TNID (throws if invalid)
UuidLike.toUpperCase(uuid);   // convert to uppercase
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

## Related Packages

- **@tnid/encryption** - Encrypt V0 TNIDs to V1 to hide timestamp information

## License

MIT
