import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const apiUrl = (process.env.ROKU_API_URL ?? process.argv[2] ?? "").replace(/\/$/, "");
if (!apiUrl) {
  console.error("Set ROKU_API_URL to the public HTTPS origin of the Harborline web app.");
  process.exit(1);
}

const parsed = new URL(apiUrl);
if (parsed.protocol !== "https:" && process.env.ROKU_ALLOW_HTTP !== "1") {
  console.error("ROKU_API_URL must use HTTPS. Set ROKU_ALLOW_HTTP=1 only for LAN sideload testing.");
  process.exit(1);
}

const appRoot = resolve(import.meta.dirname, "..");
const configuredRoot = resolve(appRoot, "dist/configured");
const outFile = resolve(appRoot, "dist/harborline-roku.zip");
rmSync(configuredRoot, { recursive: true, force: true });
mkdirSync(configuredRoot, { recursive: true });
cpSync(resolve(appRoot, "source"), resolve(configuredRoot, "source"), { recursive: true });
cpSync(resolve(appRoot, "components"), resolve(configuredRoot, "components"), { recursive: true });

const sourceManifest = readFileSync(resolve(appRoot, "manifest"), "utf8");
const manifest = sourceManifest.replace(/^api_url=.*$/m, `api_url=${apiUrl}`);
writeFileSync(resolve(configuredRoot, "manifest"), manifest);

const result = spawnSync(
  "pnpm",
  [
    "exec",
    "bsc",
    "--no-project",
    "--root-dir",
    configuredRoot,
    "--files",
    "manifest",
    "source/**/*",
    "components/**/*",
    "--out-file",
    outFile,
    "--staging-folder-path",
    resolve(appRoot, "dist/staging"),
  ],
  { cwd: appRoot, stdio: "inherit" },
);

if (result.status !== 0) process.exit(result.status ?? 1);
console.log(`Packaged Harborline Roku for ${apiUrl}: ${outFile}`);
