import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const manifest = readFileSync(resolve(root, "manifest"), "utf8");
for (const key of ["title", "major_version", "minor_version", "build_version", "ui_resolutions", "api_url"]) {
  if (!new RegExp(`^${key}=.+$`, "m").test(manifest)) throw new Error(`Missing manifest field: ${key}`);
}
if (!manifest.endsWith("\n")) throw new Error("Roku manifest must end with a newline.");
if (!/^api_url=https:\/\/njc-web\.vercel\.app$/m.test(manifest)) {
  throw new Error("The source Roku manifest must use the permanent Courier Vercel origin.");
}

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
if (!source.includes('body["platform"] = "roku"')) throw new Error("Roku audience presence is missing.");
if (!source.includes('body["target"] = "roku"')) throw new Error("Roku pairing target is missing.");
if (!source.includes("streamFormat = \"hls\"")) throw new Error("HLS live playback is missing.");
if (!source.includes('m.apiBase = "unconfigured"')) throw new Error("The Roku runtime must fail safely when its API origin is unconfigured.");
if (!source.includes("transfer.AsyncGetToString()") || !source.includes("event.GetResponseCode()")) {
  throw new Error("Roku requests must obtain HTTP status from asynchronous roUrlEvent responses.");
}
if (!source.includes("Wait(10000, port)") || !source.includes("transfer.AsyncCancel()")) {
  throw new Error("Roku requests must have a bounded timeout and cancellation path.");
}
if (!source.includes("focusedNavigationIndex()") || !source.includes("focusNavigation(navIndex")) {
  throw new Error("Roku D-pad navigation must explicitly route focus across the top controls.");
}
if (!source.includes("absoluteMediaUrl(story.image)") || !source.includes('m.apiBase + uri')) {
  throw new Error("Roku story artwork must resolve site-relative media against the configured API origin.");
}
for (const key of ["deviceName", "deviceSecret", "installationId", "appVersion"]) {
  if (!source.includes(`body["${key}"]`)) {
    throw new Error(`Roku JSON payloads must preserve the ${key} wire key.`);
  }
}
console.log(`Validated ${xmlFiles.length} SceneGraph components and Roku integration invariants.`);
