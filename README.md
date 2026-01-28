# TNID TypeScript

TypeScript implementation of [TNIDs](https://tnid.info) (Type-safe Named
Identifiers).

This monorepo contains the reference TypeScript packages for working with TNIDs.

## Packages

| Package                                   | Description                                                    |
| ----------------------------------------- | -------------------------------------------------------------- |
| [@tnid/core](./packages/core)             | Core TNID functionality - generation, parsing, UUID conversion |
| [@tnid/encryption](./packages/encryption) | Format-preserving encryption for TNIDs                         |

## Installation

```bash
# Core package (required)
npm install @tnid/core

# Encryption package (optional)
npm install @tnid/encryption
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

# Build npm packages
deno task build

# Run linter
deno lint

# Type check
deno task check
```

### Project Structure

```
tnid-typescript/
├── packages/
│   ├── core/           # @tnid/core
│   │   ├── src/
│   │   └── tests/
│   └── encryption/     # @tnid/encryption
│       ├── src/
│       └── tests/
├── scripts/
│   └── build_npm.ts    # npm build script
├── npm/                # Built npm packages (generated)
└── deno.json           # Workspace config
```

### Building for npm

```bash
# Build all packages
deno task build

# Packages are output to npm/core and npm/encryption
cd npm/core && npm publish
cd npm/encryption && npm publish
```

## Rust Compatibility

Both packages include comprehensive tests against the Rust CLI (`tnid-cli`) to
ensure bit-for-bit compatibility between implementations.

## License

MIT
