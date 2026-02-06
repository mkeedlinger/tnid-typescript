/**
 * Test harness for comparing TypeScript implementation against the Rust CLI.
 */

import * as path from "@std/path";

// Resolve CLI path relative to this file (cli is at repo root)
const CLI_PATH = path.join(import.meta.dirname!, "../../../../tnid-cli");

async function runCli(args: string[]): Promise<string> {
  const command = new Deno.Command(CLI_PATH, {
    args,
    stdout: "piped",
    stderr: "piped",
  });
  const { code, stdout, stderr } = await command.output();
  if (code !== 0) {
    throw new Error(`CLI failed: ${new TextDecoder().decode(stderr)}`);
  }
  return new TextDecoder().decode(stdout).trim();
}

/** Generate a V0 TNID using the Rust CLI */
export function cliMakeV0(
  name: string,
  timestampMs: bigint,
  random: bigint,
): Promise<string> {
  const tsHex = "0x" + timestampMs.toString(16);
  const rHex = "0x" + random.toString(16);
  return runCli(["internals", "make-v0", name, tsHex, rHex]);
}

/** Generate a V1 TNID using the Rust CLI */
export function cliMakeV1(name: string, random: bigint): Promise<string> {
  const hex = "0x" + random.toString(16);
  return runCli(["internals", "make-v1", name, hex]);
}

/** Inspect a TNID using the Rust CLI, returns parsed fields */
export async function cliInspect(tnid: string): Promise<{
  name: string;
  nameHex: string;
  variant: string;
  tnidString: string;
  uuidString: string;
}> {
  const output = await runCli(["inspect", tnid]);
  const lines = output.split("\n");
  const fields: Record<string, string> = {};
  for (const line of lines) {
    const match = line.match(/^(\w+):\s*(.+)$/);
    if (match) {
      fields[match[1]] = match[2];
    }
  }
  return {
    name: fields["name"],
    nameHex: fields["name_hex"],
    variant: fields["variant"],
    tnidString: fields["tnid_string"],
    uuidString: fields["uuid_string"],
  };
}

/** Encode a name using the Rust CLI */
export function cliEncodeName(name: string): Promise<string> {
  return runCli(["internals", "encode-name", name]);
}

/** Validate a name using the Rust CLI */
export async function cliValidateName(name: string): Promise<boolean> {
  try {
    await runCli(["validate-name", name]);
    return true;
  } catch {
    return false;
  }
}

/** Debug helper: compare TS and Rust output with detailed info */
export async function debugCompareV0(
  name: string,
  timestamp: bigint,
  random: bigint,
  tsResult: string,
): Promise<
  {
    rust: string;
    match: boolean;
    tsInspect?: Awaited<ReturnType<typeof cliInspect>>;
    rustInspect?: Awaited<ReturnType<typeof cliInspect>>;
  }
> {
  const rust = await cliMakeV0(name, timestamp, random);
  const match = rust === tsResult;
  if (!match) {
    const [tsInspect, rustInspect] = await Promise.all([
      cliInspect(tsResult).catch(() => undefined),
      cliInspect(rust).catch(() => undefined),
    ]);
    return { rust, match, tsInspect, rustInspect };
  }
  return { rust, match };
}

export async function debugCompareV1(
  name: string,
  random: bigint,
  tsResult: string,
): Promise<
  {
    rust: string;
    match: boolean;
    tsInspect?: Awaited<ReturnType<typeof cliInspect>>;
    rustInspect?: Awaited<ReturnType<typeof cliInspect>>;
  }
> {
  const rust = await cliMakeV1(name, random);
  const match = rust === tsResult;
  if (!match) {
    const [tsInspect, rustInspect] = await Promise.all([
      cliInspect(tsResult).catch(() => undefined),
      cliInspect(rust).catch(() => undefined),
    ]);
    return { rust, match, tsInspect, rustInspect };
  }
  return { rust, match };
}

/** Generate random test values */
export function randomTimestamp(): bigint {
  return BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)) &
    ((1n << 43n) - 1n);
}

export function randomV0Random(): bigint {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  let value = 0n;
  for (const byte of bytes) {
    value = (value << 8n) | BigInt(byte);
  }
  return value & ((1n << 57n) - 1n);
}

export function randomV1Random(): bigint {
  const bytes = crypto.getRandomValues(new Uint8Array(13));
  let value = 0n;
  for (const byte of bytes) {
    value = (value << 8n) | BigInt(byte);
  }
  return value & ((1n << 100n) - 1n);
}

export function randomName(): string {
  const chars = "01234abcdefghijklmnopqrstuvwxyz";
  const len = 1 + Math.floor(Math.random() * 4);
  let name = "";
  for (let i = 0; i < len; i++) {
    name += chars[Math.floor(Math.random() * chars.length)];
  }
  return name;
}
