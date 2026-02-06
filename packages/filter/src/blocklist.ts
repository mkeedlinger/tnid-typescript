/**
 * Blocklist for matching substrings in TNID data strings.
 *
 * Uses a single compiled RegExp with alternation for efficient matching.
 */

/** TNID data string alphabet: `-0-9A-Z_a-z` */
const VALID_PATTERN = /^[-0-9A-Za-z_]+$/;

/** Default maximum iterations for V0 filtered generation. */
export const DEFAULT_MAX_V0_ITERATIONS = 1_000;
/** Default maximum iterations for V1 filtered generation. */
export const DEFAULT_MAX_V1_ITERATIONS = 100;
/** Default maximum iterations for encryption-aware filtered generation. */
export const DEFAULT_MAX_ENCRYPTION_ITERATIONS = 10_000;

/**
 * Configurable iteration limits for filtered generation.
 *
 * @example
 * ```typescript
 * const blocklist = new Blocklist(["TACO"], {
 *   maxV0Iterations: 500,
 * });
 * ```
 */
export interface FilterLimits {
  /** Maximum iterations for V0 filtered generation. Default: 1,000. */
  maxV0Iterations?: number;
  /** Maximum iterations for V1 filtered generation. Default: 100. */
  maxV1Iterations?: number;
  /** Maximum iterations for encryption-aware filtered generation. Default: 10,000. */
  maxEncryptionIterations?: number;
}

/**
 * A compiled blocklist for efficient case-insensitive substring matching.
 *
 * Patterns may only contain characters from the TNID data string alphabet
 * (`-0-9A-Z_a-z`). Patterns with other characters can never match and
 * will be rejected.
 *
 * @example
 * ```typescript
 * const blocklist = new Blocklist(["TACO", "FOO", "BAZZ"]);
 *
 * blocklist.containsMatch("xyzTACOxyz"); // true
 * blocklist.containsMatch("xyztacoxyz"); // true (case-insensitive)
 * blocklist.containsMatch("xyzHELLOxyz"); // false
 * ```
 */
export class Blocklist {
  private pattern: RegExp | null;

  /**
   * Tracks the last known safe timestamp to avoid re-discovering bad windows.
   *
   * When a bad word appears in the timestamp portion, we have to bump the timestamp
   * until we escape that window. This field ensures subsequent calls don't have to
   * rediscover the same bad window — they start from the last known safe timestamp.
   */
  private lastSafeTimestamp = 0n;

  private readonly _limits: Required<FilterLimits>;

  /**
   * Creates a new blocklist from the given patterns.
   *
   * @param patterns - Patterns to match against. Must only contain TNID data alphabet characters.
   * @param limits - Optional iteration limits for filtered generation.
   * @throws {Error} If any pattern contains characters outside the TNID data alphabet.
   */
  constructor(patterns: string[], limits?: FilterLimits) {
    const nonEmpty = patterns.filter((p) => p.length > 0);
    for (const p of nonEmpty) {
      if (!VALID_PATTERN.test(p)) {
        throw new Error(
          `invalid blocklist pattern "${p}": only TNID data characters are allowed (-0-9A-Za-z_)`,
        );
      }
    }
    if (nonEmpty.length === 0) {
      this.pattern = null;
    } else {
      this.pattern = new RegExp(nonEmpty.join("|"), "i");
    }
    this._limits = {
      maxV0Iterations: limits?.maxV0Iterations ?? DEFAULT_MAX_V0_ITERATIONS,
      maxV1Iterations: limits?.maxV1Iterations ?? DEFAULT_MAX_V1_ITERATIONS,
      maxEncryptionIterations: limits?.maxEncryptionIterations ??
        DEFAULT_MAX_ENCRYPTION_ITERATIONS,
    };
  }

  /** Returns `true` if the text contains any blocklisted word. */
  containsMatch(text: string): boolean {
    if (this.pattern === null) return false;
    return this.pattern.test(text);
  }

  /**
   * Finds the first blocklist match in the text.
   * Returns the start index and length, or `null` if no match.
   */
  findFirstMatch(text: string): { start: number; length: number } | null {
    if (this.pattern === null) return null;
    const m = this.pattern.exec(text);
    if (m === null) return null;
    return { start: m.index, length: m[0].length };
  }

  /** Get a starting timestamp: max of current time and last known safe timestamp. */
  getStartingTimestamp(): bigint {
    const current = BigInt(Date.now());
    return current > this.lastSafeTimestamp ? current : this.lastSafeTimestamp;
  }

  /** Record a safe timestamp so future calls can skip past known bad windows. */
  recordSafeTimestamp(ts: bigint): void {
    if (ts > this.lastSafeTimestamp) {
      this.lastSafeTimestamp = ts;
    }
  }

  /** Returns the iteration limits for this blocklist. */
  limits(): Readonly<Required<FilterLimits>> {
    return this._limits;
  }
}
