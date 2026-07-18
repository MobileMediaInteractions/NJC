import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const isProductionDeployment =
  process.env.VERCEL === "1" && process.env.VERCEL_ENV === "production";

if (!isProductionDeployment) {
  console.log("Skipping production database migrations outside Vercel production.");
  process.exit(0);
}

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl || databaseUrl === "[encrypted]") {
  throw new Error(
    "DATABASE_URL must be available to the Vercel production build before migrations can run.",
  );
}

console.log("Applying committed production database migrations...");

const drizzleCli = fileURLToPath(
  new URL("../node_modules/drizzle-kit/bin.cjs", import.meta.url),
);
const result = spawnSync(process.execPath, [drizzleCli, "migrate"], {
  cwd: fileURLToPath(new URL("..", import.meta.url)),
  env: process.env,
  stdio: "inherit",
});

if (result.error) {
  throw result.error;
}

if (result.status !== 0) {
  throw new Error(`Production database migration failed with status ${result.status}.`);
}

console.log("Production database migrations are current.");
