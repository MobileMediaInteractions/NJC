import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const host = process.env.ROKU_DEV_TARGET;
const password = process.env.DEVPASSWORD;
if (!host || !password) {
  console.error("Set ROKU_DEV_TARGET and DEVPASSWORD before installing on a Roku device.");
  process.exit(1);
}

const archive = resolve(import.meta.dirname, "../dist/harborline-roku.zip");
if (!existsSync(archive)) {
  console.error("Package the production ZIP first with pnpm roku:package.");
  process.exit(1);
}

const result = spawnSync(
  "curl",
  [
    "--fail",
    "--silent",
    "--show-error",
    "--user",
    `rokudev:${password}`,
    "--anyauth",
    "-F",
    "mysubmit=Install",
    "-F",
    `archive=@${archive}`,
    `http://${host}/plugin_install`,
  ],
  { stdio: "inherit" },
);
process.exit(result.status ?? 1);
