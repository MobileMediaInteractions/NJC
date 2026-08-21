import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const manifest = readFileSync(resolve(root, "manifest"), "utf8");
for (const key of [
  "title",
  "major_version",
  "minor_version",
  "build_version",
  "mm_icon_focus_fhd",
  "mm_icon_focus_hd",
  "splash_screen_fhd",
  "splash_screen_hd",
  "splash_screen_sd",
  "splash_color",
  "splash_min_time",
  "ui_resolutions",
  "api_url",
]) {
  if (!new RegExp(`^${key}=.+$`, "m").test(manifest)) throw new Error(`Missing manifest field: ${key}`);
}
if (!manifest.endsWith("\n")) throw new Error("Roku manifest must end with a newline.");
if (!/^api_url=https:\/\/njc-web\.vercel\.app$/m.test(manifest)) {
  throw new Error("The source Roku manifest must use the permanent Courier Vercel origin.");
}
if (!manifest.includes("pkg:/images/normal/channel-icon_FHD.png") || !manifest.includes("pkg:/images/normal/splash-screen_FHD.png")) {
  throw new Error("The launch Roku manifest must use the normal Courier artwork set.");
}

const artwork = [
  ["normal/channel-icon_FHD.png", 540, 405],
  ["normal/channel-icon_HD.png", 290, 218],
  ["normal/splash-screen_FHD.png", 1920, 1080],
  ["normal/splash-screen_HD.png", 1280, 720],
  ["normal/splash-screen_SD.png", 720, 480],
  ["beta/channel-icon_FHD.png", 540, 405],
  ["beta/channel-icon_HD.png", 290, 218],
  ["beta/splash-screen_FHD.png", 1920, 1080],
  ["beta/splash-screen_HD.png", 1280, 720],
  ["beta/splash-screen_SD.png", 720, 480],
];

function pngDimensions(path) {
  const bytes = readFileSync(path);
  if (bytes.length < 24 || bytes.toString("ascii", 1, 4) !== "PNG") throw new Error(`Invalid PNG artwork: ${path}`);
  return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
}

for (const [file, expectedWidth, expectedHeight] of artwork) {
  const path = resolve(root, "images", file);
  if (!existsSync(path)) throw new Error(`Missing Roku artwork: ${file}`);
  const [width, height] = pngDimensions(path);
  if (width !== expectedWidth || height !== expectedHeight) {
    throw new Error(`Roku artwork ${file} must be ${expectedWidth}x${expectedHeight}; received ${width}x${height}.`);
  }
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
if (!source.includes("onNavigationSelected") || !source.includes("m.navList.setFocus(true)")) {
  throw new Error("Roku navigation must use the custom configuration-driven focus rail.");
}
if (!source.includes('if m.accessToken = "" then addNavigationItem(row, "Connect account"')) {
  throw new Error("Roku must remove the account connection control after sign-in.");
}
if (!source.includes("applyReleaseChannel(result.releaseChannel)") || !source.includes('applyReleaseChannel("production")')) {
  throw new Error("Roku prerelease presentation must follow the validated account entitlement and fail closed to production.");
}
if (!source.includes("hasPrereleaseAccess()") || !source.includes('m.releaseFlairLabel.text = "BETA"')) {
  throw new Error("Roku must expose a reusable prerelease gate and visible beta flair in the single app.");
}
if (!source.includes("absoluteMediaUrl(story.image)") || !source.includes('m.apiBase + uri')) {
  throw new Error("Roku story artwork must resolve site-relative media against the configured API origin.");
}
if (!source.includes('transfer.AddHeader("X-NJC-Capabilities", "structured-story-notes-v1")')) {
  throw new Error("Current Roku builds must explicitly negotiate structured story-note delivery.");
}
if (!source.includes('apiRequest("/api/v1/config"') || !source.includes("validConfiguration") || !source.includes('registry.Write("rokuConfig"')) {
  throw new Error("Roku must consume and retain a validated last-known-good Studio configuration.");
}
if (!source.includes("buildArticlePages") || !source.includes('key = "fastforward"') || !source.includes("m.detailOverlay.visible")) {
  throw new Error("Roku article reading must capture remote input and expose paged vertical reading.");
}
if (!source.includes('result.status = "processing"') || !source.includes("m.pairCountdownTimer") || !source.includes("m.pairSuccessTimer")) {
  throw new Error("Roku pairing must implement rotation, frozen processing and timed success states.");
}
for (const key of ["deviceName", "deviceSecret", "installationId", "appVersion"]) {
  if (!source.includes(`body["${key}"]`)) {
    throw new Error(`Roku JSON payloads must preserve the ${key} wire key.`);
  }
}
const mainSceneXml = readFileSync(resolve(root, "components/MainScene.xml"), "utf8");
if (!mainSceneXml.includes('id="releaseFlair"') || !mainSceneXml.includes('visible="false"')) {
  throw new Error("Roku release flair must remain hidden until an entitled account is validated.");
}
if (!mainSceneXml.includes('drawFocusFeedback="false"') || !mainSceneXml.includes('itemSize="[1784,224]"')) {
  throw new Error("The Roku story rail must use its custom, bounded focus renderer.");
}
if (!mainSceneXml.includes('id="detailScrollThumb"') || !mainSceneXml.includes('id="pairProcessingShade"') || !mainSceneXml.includes('id="pairSuccess"')) {
  throw new Error("Roku reader and pairing presentation states are incomplete.");
}
if (mainSceneXml.includes('id="heroScrim"')) {
  throw new Error("The unused hero image scrim must not obscure story artwork.");
}
console.log(`Validated ${xmlFiles.length} SceneGraph components, ${artwork.length} artwork files and Roku integration invariants.`);
