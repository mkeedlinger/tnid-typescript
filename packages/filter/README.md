# @tnid/filter

Generate TNIDs that don't contain blocklisted substrings (e.g., profanity).

## Why Filter TNIDs?

The 17-character data portion of a TNID string uses an alphabet that includes letters capable of forming recognizable words. For some applications, it may be undesirable for IDs to accidentally contain offensive terms.

## Installation

```bash
# npm
npm install @tnid/filter @tnid/core

# pnpm
pnpm add @tnid/filter @tnid/core

# bun
bun add @tnid/filter @tnid/core

# deno
deno add npm:@tnid/filter npm:@tnid/core
```

For encryption-aware filtering, also install `@tnid/encryption`.

## Quick Start

```typescript
import { Tnid, TnidType } from "@tnid/core";
import { Blocklist, newV0Filtered, newV1Filtered } from "@tnid/filter";

const UserId = Tnid("user");
type UserId = TnidType<typeof UserId>;

// Create a blocklist
const blocklist = new Blocklist(["TACO", "FOO", "BAZZ"]);

// Generate filtered IDs
const v0: UserId = newV0Filtered(UserId, blocklist);
const v1: UserId = newV1Filtered(UserId, blocklist);
```

### With Encryption

If you use the encryption extension to convert V0 to V1, you probably want both forms to be clean:

```typescript
import { Tnid } from "@tnid/core";
import { EncryptionKey } from "@tnid/encryption";
import { Blocklist } from "@tnid/filter";
import { newV0FilteredForEncryption } from "@tnid/filter/encryption";

const UserId = Tnid("user");
const blocklist = new Blocklist(["TACO", "FOO"]);
const key = EncryptionKey.fromHex("0102030405060708090a0b0c0d0e0f10");

// Both the V0 and its encrypted V1 will be clean
const v0 = await newV0FilteredForEncryption(UserId, blocklist, key);
```

## API Reference

### `Blocklist`

A compiled blocklist for case-insensitive substring matching. Patterns must only contain characters from the TNID data alphabet (`-0-9A-Z_a-z`).

```typescript
const blocklist = new Blocklist(["TACO", "FOO", "BAZZ"]);

blocklist.containsMatch("xyzTACOxyz"); // true
blocklist.containsMatch("xyztacoxyz"); // true (case-insensitive)
blocklist.containsMatch("xyzHELLOxyz"); // false
```

### `newV0Filtered(factory, blocklist)`

Generate a time-ordered V0 TNID whose data string contains no blocklisted words.

- **Throws**: `FilterError` if the iteration limit is exceeded

### `newV1Filtered(factory, blocklist)`

Generate a random V1 TNID whose data string contains no blocklisted words.

- **Throws**: `FilterError` if the iteration limit is exceeded

### `newV0FilteredForEncryption(factory, blocklist, key)` (from `@tnid/filter/encryption`)

Generate a V0 TNID where both the V0 and its encrypted V1 form contain no blocklisted words.

- **Returns**: `Promise<TnidValue<Name>>`
- **Throws**: `FilterError` if the iteration limit is exceeded

### `FilterError`

Thrown when filtered generation exceeds the iteration limit, which typically means the blocklist is too restrictive.

```typescript
import { FilterError } from "@tnid/filter";

try {
  const id = newV0Filtered(UserId, blocklist);
} catch (e) {
  if (e instanceof FilterError) {
    console.log(`Failed after ${e.iterations} iterations`);
  }
}
```

## How It Works

For V1, all bits are random, so the function simply regenerates until clean.

For V0, the strategy depends on where the match appears in the data string:

- **Random portion** (characters 7-16): Regenerate the random bits
- **Timestamp portion** (characters 0-6): Advance the timestamp enough to change the matched characters, avoiding a potentially large "bad window"

A global last-known-safe timestamp avoids re-discovering the same bad windows across calls.

## License

MIT
