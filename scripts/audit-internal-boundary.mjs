import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { relative, resolve, sep } from "node:path";

const root = resolve(import.meta.dirname, "..");
const output = resolve(root, "docs/security/INTERNAL_BOUNDARY_ROUTES.json");
const tracked = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { cwd: root, encoding: "utf8" }).trim().split("\n").filter(Boolean);
const routeFiles = tracked.filter((file) => /^apps\/(web|internal|platform-playground)\/src\/app\/(?:.+\/)?(page|route)\.tsx?$/.test(file));

const readableExtensions = new Set([
  ".brs", ".c", ".cc", ".cpp", ".css", ".env", ".h", ".html", ".java",
  ".js", ".json", ".kt", ".md", ".mjs", ".plist", ".rs", ".sh", ".sql",
  ".swift", ".toml", ".ts", ".tsx", ".xml", ".yaml", ".yml",
]);

function extension(file) {
  const name = file.split("/").at(-1) ?? file;
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot).toLowerCase() : "";
}

function classifyFile(file) {
  if (file.startsWith(".github/")) return { owner: "release-engineering", classification: "ci-release-control", disposition: "retain-restricted-maintenance" };
  if (/\.env(?:\.|$)/.test(file) || file === "turbo.json" || file.endsWith("vercel.json")) return { owner: "platform-operations", classification: "configuration-sensitive", disposition: "retain-without-secret-values" };
  if (file.startsWith("apps/internal/")) return { owner: "internal-operations", classification: "internal", disposition: "separate-disabled-deployment" };
  if (file.startsWith("apps/web/src/app/studio/") || file.startsWith("apps/web/src/app/api/v1/studio/")) return { owner: "newsroom-operations", classification: "internal-browser-workflow", disposition: "migrate-after-parity" };
  if (file.startsWith("apps/web/src/app/api/v1/employee/") || file.startsWith("apps/web/src/app/api/v1/mobile/admin/")) return { owner: "employee-platform", classification: "privileged-client-api", disposition: "retain-versioned-client-api" };
  if (file.startsWith("apps/web/public/")) return { owner: "publication-web", classification: "public-static", disposition: "retain-public" };
  if (file.startsWith("apps/web/")) return { owner: "publication-web", classification: "mixed-public-and-privileged", disposition: "retain-and-classify-by-route" };
  if (file.startsWith("apps/employee/")) return { owner: "employee-platform", classification: "privileged-client", disposition: "retain-separate-client" };
  if (/^apps\/(mobile|tv|roku)\//.test(file)) return { owner: "reader-platforms", classification: "public-or-account-client", disposition: "retain-outside-internal-host" };
  if (file.startsWith("apps/cdn/")) return { owner: "brand-assets", classification: "public-static", disposition: "retain-public-no-private-assets" };
  if (file.startsWith("apps/platform-playground/")) return { owner: "platform-development", classification: "development-only", disposition: "do-not-deploy" };
  if (file.startsWith("packages/backend/")) return { owner: "backend-platform", classification: "server-only", disposition: "share-with-least-privilege-data-role" };
  if (file.startsWith("packages/contracts/") || file.startsWith("packages/api-client/")) return { owner: "platform-contracts", classification: "client-safe-shared", disposition: "retain-without-secrets" };
  if (file.startsWith("tools/studio/")) return { owner: "studio-nj-dev", classification: "licensed-desktop-tool", disposition: "retain-separate-no-implicit-internal-access" };
  if (file.startsWith("platform/") || file.startsWith("visual-feature-platform/")) return { owner: "feature-platform", classification: "build-time-or-licensed-runtime", disposition: "do-not-deploy-by-default" };
  if (file.startsWith("scripts/")) return { owner: "release-engineering", classification: "build-or-operations-tooling", disposition: "retain-reviewed" };
  if (file.startsWith("docs/") || file === "README.md" || file === "TODO.md") return { owner: "project-operations", classification: "documentation", disposition: "retain-no-secrets" };
  return { owner: "repository-maintainers", classification: "repository-build-control", disposition: "retain-reviewed" };
}

function inspectFile(file) {
  const ext = extension(file);
  const testFixture = /(^|\/)(tests?|fixtures?|examples?|__tests__)(\/|$)/.test(file) || /\.(test|spec)\.[^.]+$/.test(file);
  const generated = file === "docs/security/INTERNAL_BOUNDARY_ROUTES.json" || /(^|\/)(dist|build|generated|target)(\/|$)/.test(file) || /(?:lock|tsbuildinfo)$/.test(file);
  let hasTodoMarker = false;
  if (readableExtensions.has(ext) && file !== "docs/security/INTERNAL_BOUNDARY_ROUTES.json") {
    try {
      const body = readFileSync(resolve(root, file), "utf8");
      hasTodoMarker = /\b(?:TODO|FIXME|HACK|XXX)\b/.test(body);
    } catch {
      // A path can disappear during a concurrent rename; CI will regenerate.
    }
  }
  return { file, ...classifyFile(file), testFixture, generated, hasTodoMarker };
}

const files = tracked.map(inspectFile).sort((a, b) => a.file.localeCompare(b.file));

function routeFromFile(file) {
  return file
    .replace(/^apps\/[^/]+\/src\/app/, "")
    .replace(/\/(page|route)\.tsx?$/, "")
    .replace(/\/(layout|loading|error)\.tsx?$/, "")
    .replace(/\/\([^/]+\)/g, "") || "/";
}

function classify(path, kind) {
  if (path.startsWith("/studio") || path.startsWith("/api/v1/studio") || path.startsWith("/dev/platform") || path.startsWith("/api/v1/platform/admin"))
    return { classification: "internal", auth: "Clerk staff identity plus role/action policy", disposition: "migrate-after-parity" };
  if (path.startsWith("/api/v1/employee") || path.startsWith("/api/v1/mobile/admin"))
    return { classification: "internal-client-api", auth: "Clerk bearer session plus employee capability", disposition: "retain-versioned-client-api" };
  if (path.startsWith("/api/cron"))
    return { classification: "service-only", auth: "CRON_SECRET bearer credential", disposition: "retain-service-only" };
  if (path.startsWith("/api/webhooks"))
    return { classification: "service-only", auth: "provider signature", disposition: "retain-service-only" };
  if (path.startsWith("/distribution") || path.startsWith("/api/v1/distribution"))
    return { classification: "controlled-external", auth: "Clerk account plus package/file grant", disposition: "retain-external-gated" };
  if (path.startsWith("/plus") || path.startsWith("/api/v1/plus"))
    return { classification: "account-external", auth: "Clerk account plus NJC+ entitlement where required", disposition: "retain-public-product" };
  if (path.startsWith("/press-portal") || path.startsWith("/api/v1/press-portal"))
    return { classification: "public-tokenized", auth: "request/package capability token; Studio review is separate", disposition: "retain-press-service" };
  if (path.startsWith("/api/developer") || path.startsWith("/api/v1/developer"))
    return { classification: "developer-external", auth: path.includes("/keys") ? "Clerk account" : "scoped API key", disposition: "retain-developer-service" };
  if (path.startsWith("/api/v1/platform/"))
    return { classification: "licensed-external", auth: "signed license/install receipt or admin capability", disposition: "split-admin-from-client-api" };
  if (path.startsWith("/api/v1/device-") || path.startsWith("/login"))
    return { classification: "public-protocol", auth: "single-use device secret/code plus Clerk on approval", disposition: "retain-public-protocol" };
  if (path.startsWith("/sign-in") || path.startsWith("/sign-up") || path.startsWith("/profile") || path.startsWith("/employee-link"))
    return { classification: "identity-entry", auth: "Clerk or validated app handoff", disposition: "retain-public-entry" };
  if (path.startsWith("/api/"))
    return { classification: "public-or-account-api", auth: "endpoint-specific validation, consent, account, or abuse control", disposition: "retain-and-regression-test" };
  return { classification: kind === "route" ? "public-feed-or-metadata" : "public-page", auth: "none unless page performs its own account check", disposition: "retain-public" };
}

const routes = routeFiles.map((file) => {
  const path = routeFromFile(file);
  const kind = file.endsWith("/route.ts") ? "route" : "page";
  const workspace = file.split("/").slice(0, 2).join("/");
  const boundary = workspace === "apps/internal"
    ? { classification: "internal", auth: "Cloudflare Access JWT plus matching Clerk identity and explicit internal:access grant", disposition: "retain-in-separate-internal-service" }
    : workspace === "apps/platform-playground"
      ? { classification: "development-only", auth: "none; local build only", disposition: "do-not-deploy" }
      : classify(path, kind);
  return { path, kind, workspace, file, ...boundary };
}).sort((a, b) => a.path.localeCompare(b.path) || a.file.localeCompare(b.file));

const schemaFile = "packages/backend/src/db/schema.ts";
const schema = readFileSync(resolve(root, schemaFile), "utf8");
const tables = [...schema.matchAll(/export const (\w+) = pgTable\(\s*(?:\n\s*)?["'`]([^"'`]+)["'`]/g)].map((match) => {
  const name = match[2];
  let classification = "operational-private";
  let disposition = "shared-authorized-data";
  if (/^(categories|stories|storyAuthors|mediaAssetUsages)$/.test(match[1])) classification = "publication-content";
  if (/^(analytics|audience)/.test(match[1])) classification = "privacy-sensitive-analytics";
  if (/^(employee|users$)/.test(match[1])) classification = "internal-confidential";
  if (/^(financial|premiumSubscriptions|stripe)/.test(match[1])) classification = "restricted-financial";
  if (/^(apiKeys|deviceSessions|devicePairing|platformSigning|platformLicense|platformInstall)/.test(match[1])) classification = "security-sensitive";
  if (/^(pressKit|pressAssets)/.test(match[1])) classification = "professional-contact-and-authorization";
  if (/^(distribution)/.test(match[1])) classification = "controlled-distribution";
  if (classification === "publication-content") disposition = "public-read-private-write";
  return { export: match[1], table: name, file: schemaFile, classification, disposition };
}).sort((a, b) => a.table.localeCompare(b.table));

const workspaces = tracked.filter((file) => /^(apps|packages|tools|platform|visual-feature-platform)\/.+\/package\.json$/.test(file) || /^(platform|visual-feature-platform)\/package\.json$/.test(file)).map((file) => {
  const manifest = JSON.parse(readFileSync(resolve(root, file), "utf8"));
  const directory = file.slice(0, -"/package.json".length);
  let classification = "shared-build-time";
  let deployment = "not-deployed";
  if (directory === "apps/web") { classification = "mixed-public-and-privileged"; deployment = "Vercel njc-web"; }
  else if (directory === "apps/internal") { classification = "internal"; deployment = "separate protected Vercel project, not activated"; }
  else if (directory === "apps/cdn") { classification = "public-static"; deployment = "Vercel static CDN project"; }
  else if (["apps/mobile", "apps/tv", "apps/roku"].includes(directory)) { classification = "public-client"; deployment = "store/device package"; }
  else if (directory === "apps/employee") { classification = "privileged-client"; deployment = "private mobile distribution"; }
  else if (directory === "apps/platform-playground") { classification = "development-only"; deployment = "local only"; }
  else if (directory === "tools/studio") { classification = "licensed-desktop-tool"; deployment = "signed desktop package"; }
  return { directory, package: manifest.name ?? null, classification, deployment };
}).sort((a, b) => a.directory.localeCompare(b.directory));

const record = {
  format: "njc-internal-boundary-register-v2",
  source: "git tracked and pending repository files",
  counts: {
    trackedFiles: tracked.length,
    routeSurfaces: routes.length,
    databaseTables: tables.length,
    workspaces: workspaces.length,
    todoMarkerFiles: files.filter((file) => file.hasTodoMarker).length,
    testFixtureFiles: files.filter((file) => file.testFixture).length,
    generatedFiles: files.filter((file) => file.generated).length,
  },
  workspaces,
  routes,
  tables,
  files,
};
const rendered = `${JSON.stringify(record, null, 2)}\n`;

if (process.argv.includes("--write")) {
  writeFileSync(output, rendered);
  console.log(relative(root, output).split(sep).join("/"));
} else {
  const current = readFileSync(output, "utf8");
  if (current !== rendered) {
    console.error("Internal boundary route register is stale. Run: pnpm internal:audit:write");
    process.exit(1);
  }
  console.log(`Internal boundary register current: ${files.length} files, ${routes.length} routes, ${tables.length} tables, ${workspaces.length} workspaces`);
}
