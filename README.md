# TNID Typescript

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
- **String-backed**: At runtime, TNIDs are their string representation (e.g.
  `user.Br2flcNDfF6LYICnT`). Use as Map keys, in JSON, or compare with `===`

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

---

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

---

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
Tnid("user"); // ✓
Tnid("a"); // ✓
Tnid("1234"); // ✓
Tnid("a1b2"); // ✓

// Compile errors
Tnid("users"); // ✗ too long (max 4)
Tnid("User"); // ✗ uppercase not allowed
Tnid("a-b"); // ✗ hyphen not allowed
Tnid("5"); // ✗ only digits 0-4
Tnid(""); // ✗ empty not allowed
```

---

### `NamedTnid<Name>` (returned by `Tnid()`)

#### Generation

`new_v0()` and `new_v1()` create new IDs. V0 is time-ordered (like UUIDv7), V1
is high-entropy random (like UUIDv4).

```typescript
const UserId = Tnid("user");
type UserId = TnidType<typeof UserId>;

UserId.new_v0();                        // time-ordered ID
UserId.new_v1();                        // high-entropy random ID
UserId.v0_from_parts(1234567890n, 0n);  // V0 with explicit timestamp/random (for testing)
UserId.v1_from_parts(0n);               // V1 with explicit random bits (for testing)
```

#### Parsing

`parse()` and `parseUuidString()` validate input and return typed IDs. Both
throw on invalid input or name mismatch.

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

---

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

---

### `DynamicTnid`

For working with TNIDs when the name isn't known at compile time. This is both a
**type** and a **namespace**.

#### As a Type

`DynamicTnid` accepts any TNID regardless of name:

```typescript
function logAnyId(id: DynamicTnid) {
  console.log(DynamicTnid.getName(id), id);
}

logAnyId(userId); // works
logAnyId(postId); // works
```

#### Generation

Create IDs with runtime names. Names are validated at runtime.

```typescript
DynamicTnid.new_v0("user");                          // time-ordered ID
DynamicTnid.new_v1("user");                          // high-entropy random ID
DynamicTnid.new_v0_with_time("log", new Date());     // V0 with specific timestamp
DynamicTnid.new_v0_with_parts("log", 1234567890n, 0n); // V0 with explicit parts
DynamicTnid.new_v1_with_random("log", 0n);           // V1 with explicit random
```

#### Parsing

Parse any TNID without knowing its type ahead of time. Both throw on invalid
input.

```typescript
DynamicTnid.parse("post.EUBcUw4T9x3KNOll-");         // parse any TNID string
DynamicTnid.parse_uuid_string("d6157329-4640-...");  // parse UUID to TNID
```

#### Inspection

```typescript
DynamicTnid.getName(id);              // "user" - extract the name
DynamicTnid.getNameHex(id);           // "d6157" - name as 5-char hex
DynamicTnid.getVariant(id);           // "v0" or "v1"
DynamicTnid.toUuidString(id);         // convert to UUID hex
DynamicTnid.toUuidString(id, "upper"); // uppercase UUID
```

---

### `UuidLike`

For working with UUID hex strings that may or may not be valid TNIDs. This is
both a **type** and a **namespace**.

#### As a Type

`UuidLike` represents any valid UUID hex string
(`xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`):

```typescript
function storeInDatabase(uuid: UuidLike) { ... }
```

#### Methods

```typescript
UuidLike.fromTnid(id);        // convert TNID to UUID string
UuidLike.parse(s);            // parse any UUID (validates format only, not TNID structure)
UuidLike.toTnid(uuid);        // convert UUID to TNID (throws if not a valid TNID)
UuidLike.toUpperCase(uuid);   // convert to uppercase
```

#### Example

```typescript
const id = UserId.new_v0();

// TNID to UUID
const uuid: UuidLike = UuidLike.fromTnid(id);

// Parse any UUID (doesn't validate TNID structure)
const anyUuid = UuidLike.parse("550e8400-e29b-41d4-a716-446655440000");

// Convert back to TNID (validates it's a valid TNID)
try {
  const tnid = UuidLike.toTnid(uuid); // works
  const fail = UuidLike.toTnid(anyUuid); // throws - not a TNID
} catch (e) {
  console.log("Not a valid TNID");
}
```

---

## Variants

### V0 (Time-Ordered)

- 43 bits: millisecond timestamp
- 57 bits: random
- **Use case**: When you need chronological sorting (logs, events, feeds)

```typescript
const id = UserId.new_v0();
// IDs created later sort after earlier ones
```

### V1 (High-Entropy)

- 100 bits: random
- **Use case**: When you need maximum uniqueness/unpredictability

```typescript
const id = UserId.new_v1();
// Maximum entropy, no time component
```

---

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
const wrong1: UserId = postId;           // ✗
const wrong2: PostId = userId;           // ✗
function getUser(id: UserId) { ... }
getUser(postId);                         // ✗

// DynamicTnid accepts any TNID
const dynamic: DynamicTnid = userId;     // ✓
const dynamic2: DynamicTnid = postId;    // ✓
```

### Preventing Forgery

Plain strings cannot be assigned to TNID types:

```typescript
const UserId = Tnid("user");
type UserId = TnidType<typeof UserId>;

// Compile errors - plain strings not allowed
const fake1: UserId = "user.Br2flcNDfF6LYICnT"; // ✗
const fake2: UserId = someString; // ✗

// Must use parse() or new_*() to get a valid TNID
const valid: UserId = UserId.parse("user.Br2flcNDfF6LYICnT"); // ✓
```

---

## UUID Compatibility

TNIDs are valid UUIDv8 identifiers. You can:

- Store in UUID database columns
- Use with UUID-aware tools and libraries
- Convert freely between TNID and UUID formats

```typescript
const UserId = Tnid("user");
const id = UserId.new_v0();

// To UUID
const uuid = UserId.toUuidString(id);
// "d6157329-4640-8e30-8012-345678901234"

// From UUID
const back = UserId.parseUuidString(uuid);
// back === id

// Store in database as UUID
await db.query("INSERT INTO users (id) VALUES ($1)", [uuid]);

// Retrieve and convert back
const row = await db.query("SELECT id FROM users WHERE ...");
const userId = UserId.parseUuidString(row.id);
```

---

## Common Patterns

### Define ID types for your domain

```typescript
// ids.ts
import { Tnid, TnidType } from "@tnid/core";

export const UserId = Tnid("user");
export type UserId = TnidType<typeof UserId>;

export const PostId = Tnid("post");
export type PostId = TnidType<typeof PostId>;

export const OrgId = Tnid("org");
export type OrgId = TnidType<typeof OrgId>;
```

### Use in function signatures

```typescript
import { PostId, UserId } from "./ids";

interface Post {
  id: PostId;
  authorId: UserId;
  title: string;
}

function createPost(authorId: UserId, title: string): Post {
  return {
    id: PostId.new_v0(),
    authorId,
    title,
  };
}
```

### Generic functions with DynamicTnid

```typescript
import { DynamicTnid } from "@tnid/core";

function logEntity(id: DynamicTnid) {
  const name = DynamicTnid.getName(id);
  const variant = DynamicTnid.getVariant(id);
  console.log(`[${name}:${variant}] ${id}`);
}

// Works with any TNID
logEntity(userId); // "[user:v0] user.Br2..."
logEntity(postId); // "[post:v1] post.EU..."
```

### Parsing from external sources

```typescript
import { UserId } from "./ids";

// From API request
app.get("/users/:id", (req, res) => {
  try {
    const id = UserId.parse(req.params.id);
    const user = await getUser(id);
    res.json(user);
  } catch {
    res.status(400).json({ error: "Invalid user ID" });
  }
});

// From database UUID column
const row = await db.query("SELECT id FROM users WHERE email = $1", [email]);
const userId = UserId.parseUuidString(row.id);
```

---

## License

MIT
