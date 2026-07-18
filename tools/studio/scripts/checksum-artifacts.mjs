import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const studio = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const bundle = join(studio, "src-tauri/target/release/bundle");
if (!existsSync(bundle)) throw new Error(`Native bundle directory does not exist: ${bundle}`);
const visit = (directory) => readdirSync(directory).flatMap((name) => {
  const path = join(directory, name);
  return statSync(path).isDirectory() ? visit(path) : [path];
});
const checksumPath = join(bundle, "SHA256SUMS.txt");
const lines = visit(bundle).filter((path) => path !== checksumPath).sort().map((path) => `${createHash("sha256").update(readFileSync(path)).digest("hex")}  ${relative(bundle, path).replaceAll("\\", "/")}`);
if (!lines.length) throw new Error("No native bundle artifacts were produced.");
writeFileSync(checksumPath, `${lines.join("\n")}\n`, "utf8");
console.log(`Wrote checksums for ${lines.length} NJC Studio artifact(s).`);
