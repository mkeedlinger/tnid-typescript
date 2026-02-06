/**
 * @tnid/wasm - WebAssembly implementation of TNID
 *
 * Provides the same functionality as @tnid/core but using a WebAssembly
 * implementation compiled from Rust for potentially better performance.
 *
 * @example
 * ```typescript
 * import { init, Tnid, type TnidType } from "@tnid/wasm";
 *
 * // Initialize WASM (required before using any functions)
 * await init();
 *
 * // Create a typed TNID factory
 * const UserId = Tnid("user");
 * type UserId = TnidType<typeof UserId>;
 *
 * // Generate IDs
 * const id: UserId = UserId.new_v0();
 * console.log(id); // "user.Br2flcNDfF6LYICnT"
 * ```
 *
 * @module
 */

// Re-export types from core (they're just type definitions, no runtime code)
export type {
  Case,
  NamedTnid,
  TnidType,
  TnidValue,
  TnidVariant,
  ValidateName,
} from "@tnid/core";

// Import the generated WASM bindings
import initWasm, {
  decrypt_v1_to_v0 as wasmDecryptV1ToV0,
  encrypt_v0_to_v1 as wasmEncryptV0ToV1,
  get_name as wasmGetName,
  get_variant as wasmGetVariant,
  is_valid_name as wasmIsValidName,
  new_v0 as wasmNewV0,
  new_v1 as wasmNewV1,
  parse as wasmParse,
  parse_uuid as wasmParseUuid,
  to_uuid_string as wasmToUuidString,
} from "../pkg/tnid_wasm.js";

import type {
  Case,
  NamedTnid,
  TnidValue,
  TnidVariant,
  ValidateName,
} from "@tnid/core";

// =============================================================================
// Initialization
// =============================================================================

let initialized = false;

/**
 * Initialize the WASM module. Must be called before using any other functions.
 *
 * @example
 * ```typescript
 * import { init } from "@tnid/wasm";
 * await init();
 * // Now you can use other functions
 * ```
 */
export async function init(): Promise<void> {
  if (initialized) return;

  const wasmUrl = new URL("../pkg/tnid_wasm_bg.wasm", import.meta.url);

  // Detect environment and load WASM appropriately
  // deno-lint-ignore no-explicit-any
  const g = globalThis as any;

  if (typeof g.Deno !== "undefined") {
    // Deno: read from filesystem
    const wasmBytes = await g.Deno.readFile(wasmUrl);
    await initWasm(wasmBytes);
  } else if (typeof g.process !== "undefined" && g.process.versions?.node) {
    // Node.js: read from filesystem using dynamic import
    const fs = await import(/* webpackIgnore: true */ "node:fs/promises");
    const url = await import(/* webpackIgnore: true */ "node:url");
    const wasmPath = url.fileURLToPath(wasmUrl);
    const wasmBytes = await fs.readFile(wasmPath);
    await initWasm(wasmBytes);
  } else {
    // Browser: fetch from URL
    await initWasm(wasmUrl);
  }

  initialized = true;
}

function ensureInitialized(): void {
  if (!initialized) {
    throw new Error("WASM not initialized. Call init() first.");
  }
}

// =============================================================================
// Random Generation Helpers
// =============================================================================

/** Generate 8 random bytes as a hex string (16 chars) */
function randomHex8(): string {
  const bytes = new Uint8Array(8);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Generate 16 random bytes as a hex string (32 chars) */
function randomHex16(): string {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// =============================================================================
// NamedTnid Factory
// =============================================================================

/**
 * Create a typed TNID factory for a specific name.
 *
 * @example
 * ```typescript
 * const UserId = Tnid("user");
 * type UserId = TnidType<typeof UserId>;
 *
 * const id: UserId = UserId.new_v0();
 * ```
 */
export function Tnid<Name extends string>(
  name: ValidateName<Name>,
): NamedTnid<Name> {
  return {
    name: name as Name,

    new_v0(): TnidValue<Name> {
      ensureInitialized();
      const timestamp = Date.now();
      const random = randomHex8();
      return wasmNewV0(name, timestamp, random) as TnidValue<Name>;
    },

    new_v1(): TnidValue<Name> {
      ensureInitialized();
      const random = randomHex16();
      return wasmNewV1(name, random) as TnidValue<Name>;
    },

    v0_from_parts(timestampMs: bigint, randomBits: bigint): TnidValue<Name> {
      ensureInitialized();
      const randomHex = randomBits.toString(16).padStart(16, "0");
      return wasmNewV0(name, Number(timestampMs), randomHex) as TnidValue<Name>;
    },

    v1_from_parts(randomBits: bigint): TnidValue<Name> {
      ensureInitialized();
      const randomHex = randomBits.toString(16).padStart(32, "0");
      return wasmNewV1(name, randomHex) as TnidValue<Name>;
    },

    parse(s: string): TnidValue<Name> {
      // Detect format: TNID strings contain '.', UUID strings contain '-' or are 32 hex chars
      if (s.includes(".")) {
        return this.parseTnidString(s);
      } else {
        return this.parseUuidString(s);
      }
    },

    parseTnidString(s: string): TnidValue<Name> {
      ensureInitialized();
      const parsed = wasmParse(s);
      const parsedName = wasmGetName(parsed);
      if (parsedName !== name) {
        throw new Error(
          `Name mismatch: expected '${name}', got '${parsedName}'`,
        );
      }
      return parsed as TnidValue<Name>;
    },

    parseUuidString(uuid: string): TnidValue<Name> {
      ensureInitialized();
      const parsed = wasmParseUuid(uuid);
      const parsedName = wasmGetName(parsed);
      if (parsedName !== name) {
        throw new Error(
          `Name mismatch: expected '${name}', got '${parsedName}'`,
        );
      }
      return parsed as TnidValue<Name>;
    },

    nameHex(): string {
      // The name hex is deterministic based on the name, so we can compute it
      // by creating a dummy TNID and extracting its name portion
      // For now, just create one and parse it
      ensureInitialized();
      const dummy = wasmNewV0(name, 0, "0000000000000000");
      // Name hex is the first 5 hex chars of the UUID representation
      const uuid = wasmToUuidString(dummy);
      return uuid.substring(0, 5);
    },

    variant(id: TnidValue<Name>): TnidVariant {
      ensureInitialized();
      return wasmGetVariant(id) as TnidVariant;
    },

    toUuidString(id: TnidValue<Name>, caseFormat: Case = "lower"): string {
      ensureInitialized();
      const uuid = wasmToUuidString(id);
      return caseFormat === "upper" ? uuid.toUpperCase() : uuid;
    },
  };
}

// =============================================================================
// DynamicTnid
// =============================================================================

/**
 * Runtime TNID operations without compile-time name checking.
 * Use this when you need to work with TNIDs whose names aren't known at compile time.
 */
export type DynamicTnid = TnidValue<string>;

/**
 * Namespace for dynamic TNID operations.
 */
export const DynamicTnid = {
  /**
   * Create a new V0 (time-ordered) TNID with a runtime name.
   */
  new_v0(name: string): DynamicTnid {
    ensureInitialized();
    const timestamp = Date.now();
    const random = randomHex8();
    return wasmNewV0(name, timestamp, random) as DynamicTnid;
  },

  /**
   * Create a new V1 (high-entropy) TNID with a runtime name.
   */
  new_v1(name: string): DynamicTnid {
    ensureInitialized();
    const random = randomHex16();
    return wasmNewV1(name, random) as DynamicTnid;
  },

  /**
   * Parse a TNID string.
   */
  parse(s: string): DynamicTnid {
    ensureInitialized();
    return wasmParse(s) as DynamicTnid;
  },

  /**
   * Parse a UUID string into a TNID.
   */
  parseUuidString(uuid: string): DynamicTnid {
    ensureInitialized();
    return wasmParseUuid(uuid) as DynamicTnid;
  },

  /**
   * Get the name of a TNID.
   */
  getName(id: DynamicTnid): string {
    ensureInitialized();
    return wasmGetName(id);
  },

  /**
   * Get the variant of a TNID.
   */
  getVariant(id: DynamicTnid): TnidVariant {
    ensureInitialized();
    return wasmGetVariant(id) as TnidVariant;
  },

  /**
   * Convert a TNID to UUID string format.
   */
  toUuidString(id: DynamicTnid, caseFormat: Case = "lower"): string {
    ensureInitialized();
    const uuid = wasmToUuidString(id);
    return caseFormat === "upper" ? uuid.toUpperCase() : uuid;
  },

  /**
   * Validate a TNID name.
   */
  isValidName(name: string): boolean {
    ensureInitialized();
    return wasmIsValidName(name);
  },
};

// =============================================================================
// Encryption
// =============================================================================

/**
 * Encryption key for V0/V1 format-preserving encryption.
 */
export class EncryptionKey {
  readonly #hex: string;

  private constructor(hex: string) {
    this.#hex = hex;
  }

  /**
   * Create a key from a 32-character hex string (16 bytes / 128 bits).
   */
  static fromHex(hex: string): EncryptionKey {
    if (hex.length !== 32) {
      throw new Error("Key must be exactly 32 hex characters (16 bytes)");
    }
    if (!/^[0-9a-fA-F]+$/.test(hex)) {
      throw new Error("Key must contain only hex characters");
    }
    return new EncryptionKey(hex.toLowerCase());
  }

  /**
   * Create a key from a Uint8Array of 16 bytes.
   */
  static fromBytes(bytes: Uint8Array): EncryptionKey {
    if (bytes.length !== 16) {
      throw new Error("Key must be exactly 16 bytes");
    }
    const hex = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return new EncryptionKey(hex);
  }

  /** @internal */
  _getHex(): string {
    return this.#hex;
  }
}

/**
 * Encrypt a V0 (time-ordered) TNID to V1 format.
 *
 * The resulting V1 TNID looks random but can be decrypted back to V0
 * with the same key.
 */
export function encryptV0ToV1<Name extends string>(
  tnid: TnidValue<Name>,
  key: EncryptionKey,
): TnidValue<Name> {
  ensureInitialized();
  return wasmEncryptV0ToV1(tnid, key._getHex()) as TnidValue<Name>;
}

/**
 * Decrypt a V1 TNID back to V0 format.
 */
export function decryptV1ToV0<Name extends string>(
  tnid: TnidValue<Name>,
  key: EncryptionKey,
): TnidValue<Name> {
  ensureInitialized();
  return wasmDecryptV1ToV0(tnid, key._getHex()) as TnidValue<Name>;
}
