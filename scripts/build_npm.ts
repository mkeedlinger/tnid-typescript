/**
 * Build script for publishing to npm using dnt (Deno to Node Transform).
 *
 * Run with: deno run -A scripts/build_npm.ts
 */

import { build, emptyDir } from "jsr:@deno/dnt";

await emptyDir("./npm");

await build({
  entryPoints: ["./src/index.ts"],
  outDir: "./npm",
  shims: {
    crypto: true,
  },
  filterDiagnostic(diagnostic) {
    // Ignore diagnostics from test files
    const file = diagnostic.file?.fileName;
    if (file && (file.includes("/tests/") || file.includes("_test.ts"))) {
      return false;
    }
    return true;
  },
  test: false, // Don't run tests as part of the build
  package: {
    name: "@tnid/core",
    version: Deno.args[0] || "0.0.0",
    description: "Type-safe, named, unique identifiers (TNIDs) - UUIDv8-compatible IDs with embedded type names",
    license: "MIT",
    repository: {
      type: "git",
      url: "git+https://github.com/tnid/tnid.git",
    },
    bugs: {
      url: "https://github.com/tnid/tnid/issues",
    },
    keywords: [
      "uuid",
      "id",
      "identifier",
      "tnid",
      "typed",
      "type-safe",
      "uuidv8",
    ],
  },
  postBuild() {
    // Copy additional files to npm directory
    try {
      Deno.copyFileSync("LICENSE", "npm/LICENSE");
    } catch {
      console.warn("Warning: LICENSE file not found, skipping");
    }
    try {
      Deno.copyFileSync("README.md", "npm/README.md");
    } catch {
      console.warn("Warning: README.md file not found, skipping");
    }
  },
});

console.log("\nBuild complete! To publish:");
console.log("  cd npm && npm publish --access public");
