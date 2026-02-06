/**
 * Build script for publishing to npm using dnt (Deno to Node Transform).
 *
 * Builds all packages in the monorepo with synchronized versions.
 *
 * Run with: deno run -A scripts/build_npm.ts
 */

import { build, emptyDir } from "@deno/dnt";
import { toFileUrl } from "@std/path";

// Read shared config from root deno.json
const rootConfig = JSON.parse(await Deno.readTextFile("./deno.json"));
const VERSION = rootConfig.version;
const LICENSE = rootConfig.license;

interface PackageConfig {
  name: string;
  dir: string;
  entryPoints: string | { name: string; path: string }[];
  description: string;
  readme: string;
  dependencies?: Record<string, string>;
  mappings?: Record<string, { name: string; version: string; subPath?: string; peerDependency?: boolean }>;
  // Skip npm install for packages with local dependencies not yet published
  skipNpmInstall?: boolean;
  // Import map for resolving package imports
  importMap?: string;
}

// Packages in build order (dependencies first)
const packages: PackageConfig[] = [
  {
    name: "@tnid/core",
    dir: "core",
    entryPoints: [
      { name: ".", path: "./packages/core/src/index.ts" },
      { name: "./uuid", path: "./packages/core/src/uuid.ts" },
    ],
    description:
      "Type-safe, named, unique identifiers (TNIDs) - UUID-compatible IDs with embedded type names",
    readme: "./packages/core/README.md",
  },
  {
    name: "@tnid/encryption",
    dir: "encryption",
    entryPoints: "./packages/encryption/src/index.ts",
    description:
      "Format-preserving encryption for TNIDs - convert time-ordered IDs to random-looking IDs",
    readme: "./packages/encryption/README.md",
    importMap: "./packages/encryption/deno.json",
    // peerDependencies handled via mappings with peerDependency: true
    skipNpmInstall: true,
  },
  {
    name: "@tnid/filter",
    dir: "filter",
    entryPoints: [
      { name: ".", path: "./packages/filter/src/index.ts" },
      { name: "./encryption", path: "./packages/filter/src/filter_encryption.ts" },
    ],
    description:
      "Blocklist filtering for TNIDs - generate IDs that avoid specified substrings",
    readme: "./packages/filter/README.md",
    importMap: "./packages/filter/deno.json",
    skipNpmInstall: true,
  },
  {
    name: "@tnid/wasm",
    dir: "wasm",
    entryPoints: "./packages/wasm/src/index.ts",
    description:
      "WebAssembly implementation of TNID - high-performance ID generation compiled from Rust",
    readme: "./packages/wasm/README.md",
    importMap: "./packages/wasm/deno.json",
    // peerDependencies handled via mappings with peerDependency: true
    skipNpmInstall: true,
  },
];

console.log(`Building TNID packages v${VERSION}\n`);

for (const pkg of packages) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Building ${pkg.name}@${VERSION}...`);
  console.log(`${"=".repeat(60)}\n`);

  await emptyDir(`./npm/${pkg.dir}`);

  // Normalize entryPoints to the format dnt expects
  const entryPoints = typeof pkg.entryPoints === "string"
    ? [pkg.entryPoints]
    : pkg.entryPoints;

  // Resolve import map to absolute URL if specified
  const importMapUrl = pkg.importMap
    ? toFileUrl(Deno.realPathSync(pkg.importMap)).href
    : undefined;

  // Compute mappings with resolved paths for packages with local dependencies
  let mappings = pkg.mappings || {};
  if (pkg.name === "@tnid/encryption") {
    // Resolve the actual file paths that dnt will see
    const coreIndex = toFileUrl(Deno.realPathSync("./packages/core/src/index.ts")).href;
    const coreUuid = toFileUrl(Deno.realPathSync("./packages/core/src/uuid.ts")).href;
    mappings = {
      [coreIndex]: { name: "@tnid/core", version: `^${VERSION}`, peerDependency: true },
      [coreUuid]: { name: "@tnid/core", version: `^${VERSION}`, subPath: "uuid", peerDependency: true },
    };
  } else if (pkg.name === "@tnid/filter") {
    const coreIndex = toFileUrl(Deno.realPathSync("./packages/core/src/index.ts")).href;
    const encryptionIndex = toFileUrl(Deno.realPathSync("./packages/encryption/src/index.ts")).href;
    mappings = {
      [coreIndex]: { name: "@tnid/core", version: `^${VERSION}`, peerDependency: true },
      [encryptionIndex]: { name: "@tnid/encryption", version: `^${VERSION}`, peerDependency: true },
    };
  } else if (pkg.name === "@tnid/wasm") {
    // wasm only imports from @tnid/core main export, not uuid
    const coreIndex = toFileUrl(Deno.realPathSync("./packages/core/src/index.ts")).href;
    mappings = {
      [coreIndex]: { name: "@tnid/core", version: `^${VERSION}`, peerDependency: true },
    };
  }

  // Create node_modules/@tnid symlinks for packages that depend on core/encryption
  if (pkg.name === "@tnid/encryption" || pkg.name === "@tnid/wasm" || pkg.name === "@tnid/filter") {
    const nodeModulesPath = `./npm/${pkg.dir}/node_modules/@tnid`;
    await Deno.mkdir(nodeModulesPath, { recursive: true });
    try {
      await Deno.remove(`${nodeModulesPath}/core`, { recursive: true });
    } catch { /* ignore if doesn't exist */ }
    const coreBuildPath = Deno.realPathSync("./npm/core");
    await Deno.symlink(coreBuildPath, `${nodeModulesPath}/core`);
    console.log(`  Linked @tnid/core from ${coreBuildPath}`);
  }
  if (pkg.name === "@tnid/filter") {
    const nodeModulesPath = `./npm/${pkg.dir}/node_modules/@tnid`;
    try {
      await Deno.remove(`${nodeModulesPath}/encryption`, { recursive: true });
    } catch { /* ignore if doesn't exist */ }
    const encryptionBuildPath = Deno.realPathSync("./npm/encryption");
    await Deno.symlink(encryptionBuildPath, `${nodeModulesPath}/encryption`);
    console.log(`  Linked @tnid/encryption from ${encryptionBuildPath}`);
  }

  await build({
    entryPoints,
    outDir: `./npm/${pkg.dir}`,
    shims: {},
    importMap: importMapUrl,
    mappings,
    skipNpmInstall: pkg.skipNpmInstall ?? false,
    compilerOptions: {
      // Include DOM lib for Web Crypto API types (CryptoKey, etc)
      lib: ["ESNext", "DOM"],
    },
    filterDiagnostic(diagnostic) {
      const file = diagnostic.file?.fileName;
      // Ignore diagnostics from test files
      if (file && (file.includes("/tests/") || file.includes("_test.ts"))) {
        return false;
      }
      // Ignore diagnostics from dnt polyfills
      if (file && file.includes("_dnt.polyfills.ts")) {
        return false;
      }
      // For wasm package: ignore node module resolution errors (dynamic imports)
      if (pkg.name === "@tnid/wasm" && diagnostic.code === 2307) {
        return false;
      }
      return true;
    },
    test: false,
    package: {
      name: pkg.name,
      version: VERSION,
      description: pkg.description,
      license: LICENSE,
      repository: {
        type: "git",
        url: "git+https://github.com/mkeedlinger/tnid-typescript.git",
      },
      bugs: {
        url: "https://github.com/mkeedlinger/tnid-typescript/issues",
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
      dependencies: pkg.dependencies || {},
    },
    async postBuild() {
      // Copy LICENSE
      try {
        Deno.copyFileSync("LICENSE.txt", `npm/${pkg.dir}/LICENSE`);
      } catch {
        console.warn("  Warning: LICENSE.txt not found, skipping");
      }

      // Copy README
      try {
        Deno.copyFileSync(pkg.readme, `npm/${pkg.dir}/README.md`);
      } catch {
        console.warn(`  Warning: ${pkg.readme} not found, skipping`);
      }

      // For wasm package: copy pkg/ directory to both esm/ and script/
      if (pkg.name === "@tnid/wasm") {
        const wasmPkgSrc = "./packages/wasm/pkg";

        // Copy to esm/pkg/ (for ESM imports)
        const wasmPkgDstEsm = `./npm/${pkg.dir}/esm/pkg`;
        await Deno.mkdir(wasmPkgDstEsm, { recursive: true });
        for await (const entry of Deno.readDir(wasmPkgSrc)) {
          // Skip .gitignore - it contains "*" which excludes everything when npm packs
          if (entry.isFile && entry.name !== ".gitignore") {
            await Deno.copyFile(`${wasmPkgSrc}/${entry.name}`, `${wasmPkgDstEsm}/${entry.name}`);
          }
        }
        console.log(`  Copied WASM pkg/ to ${wasmPkgDstEsm}`);

        // Copy to script/pkg/ (for CommonJS imports)
        const wasmPkgDstScript = `./npm/${pkg.dir}/script/pkg`;
        await Deno.mkdir(wasmPkgDstScript, { recursive: true });
        for await (const entry of Deno.readDir(wasmPkgSrc)) {
          // Skip .gitignore - it contains "*" which excludes everything when npm packs
          if (entry.isFile && entry.name !== ".gitignore") {
            await Deno.copyFile(`${wasmPkgSrc}/${entry.name}`, `${wasmPkgDstScript}/${entry.name}`);
          }
        }
        console.log(`  Copied WASM pkg/ to ${wasmPkgDstScript}`);
      }
    },
  });

  console.log(`\n  Built ${pkg.name}@${VERSION}`);
}

console.log(`\n${"=".repeat(60)}`);
console.log("Build complete!");
console.log(`${"=".repeat(60)}\n`);

console.log("To publish all packages:");
for (const pkg of packages) {
  console.log(`  cd npm/${pkg.dir} && npm publish`);
}
