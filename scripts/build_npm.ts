/**
 * Build script for publishing to npm using dnt (Deno to Node Transform).
 *
 * Run with: deno run -A scripts/build_npm.ts
 */

import { build, emptyDir } from "jsr:@deno/dnt";

const denoJson = JSON.parse(await Deno.readTextFile("./deno.json"));

await emptyDir("./npm");

await build({
  entryPoints: ["./src/index.ts"],
  outDir: "./npm",
  shims: {},
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
    name: denoJson.name,
    version: denoJson.version,
    description:
      "Type-safe, named, unique identifiers (TNIDs) - UUID-compatible IDs with embedded type names",
    license: denoJson.license,
    repository: {
      type: "git",
      url: "git+https://github.com/tnid/tnid-typescript.git",
    },
    bugs: {
      url: "https://github.com/tnid/tnid-typescript/issues",
    },
    keywords: [
      "uuid",
      "id",
      "identifier",
      "tnid",
      "typed",
      "type-safe",
    ],
    publishConfig: {
      access: "public",
    },
    engines: {
      node: ">=20",
    },
  },
  postBuild() {
    // Copy additional files to npm directory
    try {
      Deno.copyFileSync("LICENSE.txt", "npm/LICENSE");
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
console.log("  cd npm && npm publish");
