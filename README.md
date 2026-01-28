# @tnid/core

Type-safe, named, unique identifiers (TNIDs) for TypeScript.

TNIDs are UUIDv8-compatible identifiers with embedded type names, providing compile-time type safety and human-readable prefixes.

## Installation

```bash
# npm
npm install @tnid/core

# pnpm
pnpm add @tnid/core

# bun
bun add @tnid/core

# deno
deno add @tnid/core
```

## Quick Start

```typescript
import { Tnid, TnidType, DynamicTnid, UuidLike } from "@tnid/core";

// Create a typed factory (compile-time name validation)
const UserId = Tnid("user");
type UserId = TnidType<typeof UserId>;

// Generate IDs
const id: UserId = UserId.new_v0();  // time-ordered (like UUIDv7)
const id2: UserId = UserId.new_v1(); // high-entropy random (like UUIDv4)

// Parse existing IDs
const parsed = UserId.parse("user.Br2flcNDfF6LYICnT");

// Convert to/from UUID format
const uuid = UserId.toUuidString(id);
const fromUuid = UserId.parseUuidString(uuid);
```

## Features

- **Compile-time type safety**: Different TNID types are incompatible at the type level
- **Human-readable prefixes**: IDs like `user.Br2flcNDfF6LYICnT` are self-documenting
- **UUIDv8 compatible**: Store in any UUID column, use with existing UUID tooling
- **Time-ordered (V0)**: Sortable by creation time, similar to UUIDv7
- **High-entropy (V1)**: Maximum randomness, similar to UUIDv4

## API

### `Tnid(name)`

Create a factory for TNIDs with a specific name. Name must be 1-4 characters using `0-4` and `a-z`.

```typescript
const UserId = Tnid("user");
const PostId = Tnid("post");

// Compile errors:
// Tnid("users")  // too long
// Tnid("User")   // uppercase not allowed
// Tnid("5")      // only 0-4 allowed
```

### Factory Methods

```typescript
const UserId = Tnid("user");

UserId.new_v0()              // time-ordered ID
UserId.new_v1()              // random ID
UserId.parse(str)            // parse TNID string
UserId.parseUuidString(uuid) // parse UUID hex string
UserId.toUuidString(id)      // convert to UUID hex
UserId.variant(id)           // get variant ("v0" | "v1")
UserId.nameHex()             // name as hex (e.g., "d6157")
```

### `DynamicTnid`

For working with TNIDs when the name isn't known at compile time.

```typescript
// Create with runtime name
const id = DynamicTnid.new_v0("user");

// Parse any TNID
const parsed = DynamicTnid.parse("post.EUBcUw4T9x3KNOll-");

// Inspect
DynamicTnid.getName(parsed);    // "post"
DynamicTnid.getVariant(parsed); // "v1"
```

### `UuidLike`

For working with UUID hex strings that may or may not be valid TNIDs.

```typescript
// From TNID
const uuid = UuidLike.fromTnid(id);

// Parse any UUID (format only, no TNID validation)
const anyUuid = UuidLike.parse("550e8400-e29b-41d4-a716-446655440000");

// Convert to TNID (validates structure)
const tnid = UuidLike.toTnid(uuid);
```

## Type Safety

Different TNID types are incompatible:

```typescript
const UserId = Tnid("user");
const PostId = Tnid("post");
type UserId = TnidType<typeof UserId>;
type PostId = TnidType<typeof PostId>;

const userId: UserId = UserId.new_v0();
const postId: PostId = PostId.new_v0();

// Compile error: Type 'PostId' is not assignable to type 'UserId'
const wrong: UserId = postId;
```

`DynamicTnid` accepts any TNID:

```typescript
function logAny(id: DynamicTnid) {
  console.log(DynamicTnid.getName(id));
}

logAny(userId); // works
logAny(postId); // works
```

## License

MIT
