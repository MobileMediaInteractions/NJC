import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const studio = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const root = resolve(studio, "../..");
const read = (path) => readFileSync(join(studio, path), "utf8");
const packageJson = JSON.parse(read("package.json"));
const tauri = JSON.parse(read("src-tauri/tauri.conf.json"));
const capability = JSON.parse(read("src-tauri/capabilities/main.json"));
const cargo = read("src-tauri/Cargo.toml");
const nativeSource = read("src-tauri/src/main.rs");
const workflow = readFileSync(join(root, ".github/workflows/studio-packages.yml"), "utf8");
const failures = [];
let checks = 0;
const check = (condition, message) => { checks += 1; if (!condition) failures.push(message); };
const cargoVersion = /^version\s*=\s*"([^"]+)"/m.exec(cargo)?.[1];

check(packageJson.name === "@njcourier/studio", "npm workspace identity must be @njcourier/studio");
check(tauri.productName === "NJC Studio", "Tauri product name must be NJC Studio");
check(tauri.identifier === "com.mobilemediainteractions.njc.studio", "desktop bundle identifier is not canonical");
check(packageJson.version === tauri.version && tauri.version === cargoVersion, "package, Tauri and Cargo versions must match");
check(tauri.bundle?.active === true && tauri.bundle?.targets === "all", "native installer bundling must remain enabled for all targets");
check(typeof tauri.app?.security?.csp === "string", "a production CSP is required");
check(!tauri.app.security.csp.includes("unsafe-eval") && !tauri.app.security.csp.includes("default-src *"), "CSP must not allow unsafe evaluation or wildcard sources");
check(Array.isArray(capability.permissions), "the main window needs an explicit capability list");
check(!capability.permissions.some((permission) => permission.startsWith("shell:") || permission.startsWith("fs:")), "frontend shell/filesystem capabilities are forbidden");
check(capability.permissions.every((permission) => ["core:default", "dialog:allow-open", "dialog:allow-save"].includes(permission)), "unexpected Tauri capability detected");
check(cargo.includes("[profile.release]") && cargo.includes("lto = true") && cargo.includes('panic = "abort"'), "hardened Cargo release profile is required");
check(nativeSource.includes("MAX_BLUEPRINT_NODES: usize = 10_000") && nativeSource.includes("MAX_BLUEPRINT_EDGES: usize = 50_000"), "native Blueprint requests must retain bounded graph limits");
check(nativeSource.includes("spawn_blocking(move || layout_blueprint_graph_inner"), "native Blueprint layout must remain off the async/UI executor");
check(nativeSource.includes("blueprint_layout_handles_thousands_of_nodes"), "large-graph native layout coverage is required");
check(nativeSource.includes("MAX_VIDEO_FRAMES: usize = 3_600") && nativeSource.includes("MAX_VIDEO_TOTAL_BYTES: usize = 256 * 1024 * 1024"), "rendered video input must retain bounded frame and payload limits");
check(nativeSource.includes("spawn_blocking(move ||") && nativeSource.includes("export_animation_video_inner(destination, frames, width, height, fps)"), "MP4 encoding must remain off the async/UI executor");
check(nativeSource.includes('"studio.import-animation"') && nativeSource.includes('"studio.export-mp4"'), "the native File menu must expose import and rendered export workflows");
check(nativeSource.includes("video_export_encodes_rendered_png_frames_when_ffmpeg_is_available"), "native rendered-video export coverage is required");
check(workflow.includes("pnpm studio:check") && workflow.includes("checksum-artifacts.mjs"), "release workflow must verify Studio and checksum artifacts");
for (const icon of ["icon.icns", "icon.ico", "icon.png", "128x128@2x.png"]) check(existsSync(join(studio, "src-tauri/icons", icon)), `required icon is missing: ${icon}`);

if (failures.length) {
  console.error("NJC Studio production-readiness checks failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log(`NJC Studio production configuration passed ${checks} release checks.`);
}
