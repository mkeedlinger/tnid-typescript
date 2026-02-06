/**
 * Blocklist for matching substrings in TNID data strings.
 *
 * Uses a single compiled RegExp with alternation for efficient matching.
 */

/** TNID data string alphabet: `-0-9A-Z_a-z` */
const VALID_PATTERN = /^[-0-9A-Za-z_]+$/;

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
   * Creates a new blocklist from the given patterns.
   *
   * @throws {Error} If any pattern contains characters outside the TNID data alphabet.
   */
  constructor(patterns: string[]) {
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
}
