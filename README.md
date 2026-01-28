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

## Quick Start

```typescript
import { DynamicTnid, Tnid, TnidType, UuidLike } from "@tnid/core";

// Create a typed factory (compile-time name validation)
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

---

## API Reference

### Exports

```typescript
import {
  Case, // "lower" | "upper"
  DynamicTnid, // Runtime TNID operations (type + namespace)
  Tnid, // Factory creator function
  TnidFactory, // Factory interface
  TnidType, // Type helper to extract ID type from factory
  // Types only:
  TnidValue, // Branded string type
  TnidVariant, // "v0" | "v1" | "v2" | "v3"
  UuidLike, // UUID string operations (type + namespace)
} from "@tnid/core";
```

---

### `Tnid(name)`

Creates a factory for TNIDs with a specific name. The name is validated at
**compile time**.

```typescript
const UserId = Tnid("user");
const PostId = Tnid("post");
const Item = Tnid("item");
```

#### Name Rules

- **Length**: 1-4 characters
- **Valid characters**: `0-4` and `a-z` (31 characters total)
- **Case**: lowercase only

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

### `TnidFactory<Name>` (returned by `Tnid()`)

The factory object returned by `Tnid(name)` has these methods:

#### Properties

| Property | Type   | Description                                |
| -------- | ------ | ------------------------------------------ |
| `name`   | `Name` | The TNID name this factory creates IDs for |

#### Generation Methods

| Method                                   | Returns           | Description                                       |
| ---------------------------------------- | ----------------- | ------------------------------------------------- |
| `new_v0()`                               | `TnidValue<Name>` | Generate a time-ordered ID (like UUIDv7)          |
| `new_v1()`                               | `TnidValue<Name>` | Generate a high-entropy random ID (like UUIDv4)   |
| `v0_from_parts(timestampMs, randomBits)` | `TnidValue<Name>` | Create V0 from explicit parts (for testing)       |
| `v1_from_parts(randomBits)`              | `TnidValue<Name>` | Create V1 from explicit random bits (for testing) |

#### Parsing Methods

| Method                  | Returns           | Throws                           | Description             |
| ----------------------- | ----------------- | -------------------------------- | ----------------------- |
| `parse(s)`              | `TnidValue<Name>` | If invalid or name mismatch      | Parse a TNID string     |
| `parseUuidString(uuid)` | `TnidValue<Name>` | If invalid UUID or name mismatch | Parse a UUID hex string |

#### Utility Methods

| Method                    | Returns       | Description                            |
| ------------------------- | ------------- | -------------------------------------- |
| `variant(id)`             | `TnidVariant` | Get the variant (`"v0"`, `"v1"`, etc.) |
| `toUuidString(id, case?)` | `string`      | Convert to UUID hex format             |
| `nameHex()`               | `string`      | Get the name as a 5-char hex string    |

#### Example

```typescript
const UserId = Tnid("user");
type UserId = TnidType<typeof UserId>;

// Generation
const id: UserId = UserId.new_v0(); // "user.Br2flcNDfF6LYICnT"
const id2: UserId = UserId.new_v1(); // "user.EUBcUw4T9x3KNOll-"

// Parsing
const parsed: UserId = UserId.parse("user.Br2flcNDfF6LYICnT");
const fromUuid: UserId = UserId.parseUuidString(
  "d6157329-4640-8e30-8012-345678901234",
);

// Utilities
UserId.variant(id); // "v0"
UserId.toUuidString(id); // "d6157329-4640-8e30-8012-..."
UserId.toUuidString(id, "upper"); // "D6157329-4640-8E30-8012-..."
UserId.nameHex(); // "d6157"

// Factory property
UserId.name; // "user"
```

---

### `TnidType<Factory>`

Type helper to extract the `TnidValue` type from a factory.

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

const userId: UserId = UserId.new_v0();
const postId: PostId = PostId.new_v0();

logAnyId(userId); // works
logAnyId(postId); // works
```

#### Namespace Methods

##### Generation

| Method                                         | Returns       | Description                                |
| ---------------------------------------------- | ------------- | ------------------------------------------ |
| `new_v0(name)`                                 | `DynamicTnid` | Generate time-ordered ID with runtime name |
| `new_v1(name)`                                 | `DynamicTnid` | Generate high-entropy ID with runtime name |
| `new_time_ordered(name)`                       | `DynamicTnid` | Alias for `new_v0`                         |
| `new_high_entropy(name)`                       | `DynamicTnid` | Alias for `new_v1`                         |
| `new_v0_with_time(name, date)`                 | `DynamicTnid` | V0 with specific timestamp                 |
| `new_v0_with_parts(name, epochMillis, random)` | `DynamicTnid` | V0 with explicit parts                     |
| `new_v1_with_random(name, randomBits)`         | `DynamicTnid` | V1 with explicit random bits               |

##### Parsing

| Method                    | Returns       | Throws     | Description           |
| ------------------------- | ------------- | ---------- | --------------------- |
| `parse(s)`                | `DynamicTnid` | If invalid | Parse any TNID string |
| `parse_uuid_string(uuid)` | `DynamicTnid` | If invalid | Parse UUID to TNID    |

##### Inspection

| Method                    | Returns       | Description              |
| ------------------------- | ------------- | ------------------------ |
| `getName(id)`             | `string`      | Extract the name portion |
| `getNameHex(id)`          | `string`      | Get name as 5-char hex   |
| `getVariant(id)`          | `TnidVariant` | Get the variant          |
| `toUuidString(id, case?)` | `string`      | Convert to UUID hex      |

#### Example

```typescript
// Runtime name - useful for dynamic/generic code
const entityType = "user"; // from config, API, etc.
const id = DynamicTnid.new_v0(entityType);

// Parse any TNID without knowing its type
const unknown = DynamicTnid.parse("post.EUBcUw4T9x3KNOll-");
console.log(DynamicTnid.getName(unknown)); // "post"
console.log(DynamicTnid.getVariant(unknown)); // "v1"

// Create with specific timestamp
const backdated = DynamicTnid.new_v0_with_time("log", new Date("2024-01-01"));

// Convert to UUID
const uuid = DynamicTnid.toUuidString(id);
```

---

### `UuidLike`

For working with UUID hex strings that may or may not be valid TNIDs. This is
both a **type** and a **namespace**.

#### As a Type

`UuidLike` represents any valid UUID hex string (format:
`xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`):

```typescript
function storeInDatabase(uuid: UuidLike) { ... }
```

#### Namespace Methods

| Method              | Returns       | Throws              | Description                         |
| ------------------- | ------------- | ------------------- | ----------------------------------- |
| `fromTnid(id)`      | `UuidLike`    | -                   | Convert TNID to UUID string         |
| `parse(s)`          | `UuidLike`    | If invalid format   | Parse any UUID string (format only) |
| `toTnid(uuid)`      | `DynamicTnid` | If not a valid TNID | Convert UUID to TNID                |
| `toUpperCase(uuid)` | `UuidLike`    | -                   | Convert to uppercase                |

#### Example

```typescript
const UserId = Tnid("user");
const id = UserId.new_v0();

// TNID to UUID
const uuid: UuidLike = UuidLike.fromTnid(id);
// "d6157329-4640-8e30-8012-345678901234"

// Parse any UUID (doesn't validate TNID structure)
const anyUuid = UuidLike.parse("550e8400-e29b-41d4-a716-446655440000");

// Convert back to TNID (validates it's a valid TNID)
try {
  const tnid = UuidLike.toTnid(uuid); // works
  const fail = UuidLike.toTnid(anyUuid); // throws - not a TNID
} catch (e) {
  console.log("Not a valid TNID");
}

// Case conversion
const upper = UuidLike.toUpperCase(uuid);
// "D6157329-4640-8E30-8012-345678901234"
```

---

## TNID Format

A TNID string has two parts separated by a dot:

```
user.Br2flcNDfF6LYICnT
^^^^  ^^^^^^^^^^^^^^^^^
name  data (17 chars)
```

- **Name**: 1-4 characters (`0-4`, `a-z`)
- **Data**: 17 characters using a custom 6-bit encoding (102 bits of data)

Total length: 3-22 characters (name + dot + data)

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
