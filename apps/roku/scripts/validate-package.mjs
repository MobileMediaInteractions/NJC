import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const manifest = readFileSync(resolve(root, "manifest"), "utf8");
for (const key of ["title", "major_version", "minor_version", "build_version", "ui_resolutions", "api_url"]) {
  if (!new RegExp(`^${key}=.+$`, "m").test(manifest)) throw new Error(`Missing manifest field: ${key}`);
}
if (!manifest.endsWith("\n")) throw new Error("Roku manifest must end with a newline.");

const xmlFiles = [];
function collect(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) collect(path);
    else if (entry.name.endsWith(".xml")) xmlFiles.push(path);
  }
}
collect(resolve(root, "components"));
for (const file of xmlFiles) execFileSync("xmllint", ["--noout", file], { stdio: "pipe" });

const source = [
  readFileSync(resolve(root, "components/tasks/ApiTask.brs"), "utf8"),
  readFileSync(resolve(root, "components/MainScene.brs"), "utf8"),
].join("\n");
if (!source.includes('platform: "roku"')) throw new Error("Roku audience presence is missing.");
if (!source.includes('target: "roku"')) throw new Error("Roku pairing target is missing.");
if (!source.includes("streamFormat = \"hls\"")) throw new Error("HLS live playback is missing.");
console.log(`Validated ${xmlFiles.length} SceneGraph components and Roku integration invariants.`);
