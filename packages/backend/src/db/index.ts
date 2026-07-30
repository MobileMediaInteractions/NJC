import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

function configuredDatabaseUrl() {
  const value = process.env.DATABASE_URL?.trim();
  if (!value || value === "[SENSITIVE]" || value === "[encrypted]") return null;
  try {
    const url = new URL(value);
    return url.protocol === "postgres:" || url.protocol === "postgresql:"
      ? value
      : null;
  } catch {
    return null;
  }
}

function createDb() {
  const databaseUrl = configuredDatabaseUrl();

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured");
  }

  // Editorial and employee workflows use atomic callback transactions. The
  // neon-http Drizzle driver throws for that API; Neon Pool supports it within
  // the lifetime of a Vercel function request.
  const pool = new Pool({ connectionString: databaseUrl });
  return drizzle(pool, { schema });
}

let database: ReturnType<typeof createDb> | null = null;

export function hasDatabase() {
  return Boolean(configuredDatabaseUrl());
}

export function getDb() {
  if (!database) database = createDb();
  return database;
}
