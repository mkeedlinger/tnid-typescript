# TNID TypeScript

TypeScript implementation of [TNIDs](https://tnid.info) (Type-safe Named
Identifiers).

This monorepo contains the reference TypeScript packages for working with TNIDs.

## Packages

| Package                                   | Description                                                    |
| ----------------------------------------- | -------------------------------------------------------------- |
| [@tnid/core](./packages/core)             | Core TNID functionality - generation, parsing, UUID conversion |
| [@tnid/encryption](./packages/encryption) | Encrypt V0 TNIDs to hide timestamp information                 |
| [@tnid/filter](./packages/filter)         | Generate TNIDs that avoid blocklisted substrings               |
| [@tnid/wasm](./packages/wasm)             | Rust reference implementation via WebAssembly                  |

## Installation

```bash
# Core package (required)
npm install @tnid/core

# Optional extensions
npm install @tnid/encryption
npm install @tnid/filter
```

## Platform Support

All packages require `globalThis.crypto` (Web Crypto API):

- Node.js 20+
- Deno 1.0+
- Bun 1.0+
- Modern browsers (ES2020+)

## Quick Example

```typescript
import { Tnid, TnidType } from "@tnid/core";

// Create a typed TNID factory
const UserId = Tnid("user");
type UserId = TnidType<typeof UserId>;

// Generate IDs
const id: UserId = UserId.new_v0(); // time-ordered
console.log(id); // "user.Br2flcNDfF6LYICnT"

// Convert to UUID for database storage
const uuid = UserId.toUuidString(id); // "d6157329-4640-8e30-..."
```

See the [package READMEs](./packages) for full API documentation.

## Development

### Prerequisites

- [Deno](https://deno.land/) 1.0+
- Rust CLI (`tnid-cli`) for compatibility tests

### Commands

```bash
# Run all tests
deno task test

# Run tests for a specific package
deno task test:core
deno task test:encryption
deno task test:filter

# Build npm packages
deno task build

# Run linter
deno lint

# Type check
deno task check
```

### Building for npm

```bash
deno task build
```

## Rust Compatibility

Packages include comprehensive tests against the Rust CLI (`tnid-cli`) to
ensure bit-for-bit compatibility between implementations.

## License

MIT
