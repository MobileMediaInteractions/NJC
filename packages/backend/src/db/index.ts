import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

function createDb() {
  const databaseUrl = process.env.DATABASE_URL;

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
  return Boolean(process.env.DATABASE_URL);
}

export function getDb() {
  if (!database) database = createDb();
  return database;
}
