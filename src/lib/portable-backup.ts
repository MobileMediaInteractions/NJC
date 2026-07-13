import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { gzip, gunzip } from "node:zlib";
import { promisify } from "node:util";
import { getTableColumns } from "drizzle-orm";
import { list } from "@vercel/blob";
import pack from "tar-stream";
import { getDb, hasDatabase } from "@/db";
import * as schema from "@/db/schema";
import { siteConfig } from "@/lib/site";

const gzipAsync = promisify(gzip); const gunzipAsync = promisify(gunzip);
const format = "harborline-portable-backup-v1";
type Dataset = { name: string; table: Parameters<typeof getTableColumns>[0]; rows: Record<string, unknown>[] };

function toRecordRows(rows: unknown[]) { return rows.map((row) => ({ ...(row as Record<string, unknown>) })); }
function sanitize(name: string, rows: Record<string, unknown>[]) {
  if (name === "api_keys") return rows.map((row) => ({ ...row, keyHash: "DISABLED_AFTER_RESTORE", revokedAt: row.revokedAt ?? new Date().toISOString() }));
  if (name === "data_requests") return rows.map((row) => ({ ...row, verificationTokenHash: null }));
  return rows;
}

async function readDatasets(): Promise<Dataset[]> {
  if (!hasDatabase()) throw new Error("DATABASE_URL is required for a portable backup"); const db = getDb();
  const data = await Promise.all([
    db.select().from(schema.users), db.select().from(schema.categories), db.select().from(schema.stories), db.select().from(schema.storyRevisions),
    db.select().from(schema.mediaAssets), db.select().from(schema.assignments), db.select().from(schema.comments), db.select().from(schema.newsletterSubscribers),
    db.select().from(schema.alerts), db.select().from(schema.liveEvents), db.select().from(schema.newsTips), db.select().from(schema.apiKeys),
    db.select().from(schema.apiAuditLogs), db.select().from(schema.pushDevices), db.select().from(schema.siteSettings), db.select().from(schema.dataRequests),
    db.select().from(schema.portableExports),
  ]);
  const definitions = [
    ["users", schema.users], ["categories", schema.categories], ["stories", schema.stories], ["story_revisions", schema.storyRevisions],
    ["media_assets", schema.mediaAssets], ["assignments", schema.assignments], ["comments", schema.comments], ["newsletter_subscribers", schema.newsletterSubscribers],
    ["alerts", schema.alerts], ["live_events", schema.liveEvents], ["news_tips", schema.newsTips], ["api_keys", schema.apiKeys],
    ["api_audit_logs", schema.apiAuditLogs], ["push_devices", schema.pushDevices], ["site_settings", schema.siteSettings], ["data_requests", schema.dataRequests],
    ["portable_exports", schema.portableExports],
  ] as const;
  return definitions.map(([name, table], index) => ({ name, table, rows: sanitize(name, toRecordRows(data[index] as unknown[])) }));
}

function jsonValue(value: unknown) { return JSON.stringify(value, (_key, current) => current instanceof Date ? current.toISOString() : current, 2); }
function csvValue(value: unknown) { if (value === null || value === undefined) return ""; const text = value instanceof Date ? value.toISOString() : typeof value === "object" ? JSON.stringify(value) : String(value); return `"${text.replaceAll('"', '""')}"`; }
function sqlValue(value: unknown) { if (value === null || value === undefined) return "NULL"; if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL"; if (typeof value === "boolean") return value ? "TRUE" : "FALSE"; const text = value instanceof Date ? value.toISOString() : typeof value === "object" ? JSON.stringify(value) : String(value); return `'${text.replaceAll("'", "''")}'`; }
function datasetCsv(dataset: Dataset) { const columns = Object.keys(getTableColumns(dataset.table)); const names = columns.map((key) => getTableColumns(dataset.table)[key].name); return [names.map(csvValue).join(","), ...dataset.rows.map((row) => columns.map((key) => csvValue(row[key])).join(","))].join("\n"); }
function datasetSql(dataset: Dataset) { if (!dataset.rows.length) return `-- ${dataset.name}: no rows\n`; const columns = Object.keys(getTableColumns(dataset.table)); const names = columns.map((key) => `"${getTableColumns(dataset.table)[key].name}"`).join(", "); const rows = dataset.rows.map((row) => `(${columns.map((key) => sqlValue(row[key])).join(", ")})`).join(",\n"); return `INSERT INTO "${dataset.name}" (${names}) VALUES\n${rows}\nON CONFLICT DO NOTHING;\n`; }
function entry(archive: pack.Pack, name: string, body: string | Buffer) { archive.entry({ name, mode: 0o600, mtime: new Date(0) }, body); }

async function collectArchive(archive: pack.Pack) { const chunks: Buffer[] = []; const done = new Promise<Buffer>((resolve, reject) => { archive.on("data", (chunk) => chunks.push(Buffer.from(chunk))); archive.on("end", () => resolve(Buffer.concat(chunks))); archive.on("error", reject); }); archive.finalize(); return done; }

export async function createPortableBackup(options: { passphrase: string; includeMedia?: boolean; maxBytes?: number }) {
  if (options.passphrase.length < 14) throw new Error("Use a backup passphrase with at least 14 characters");
  const datasets = await readDatasets(); const archive = pack.pack();
  const manifest = { format, createdAt: new Date().toISOString(), site: siteConfig, database: { engine: "PostgreSQL", tables: datasets.map((item) => ({ name: item.name, rows: item.rows.length })) }, security: { encrypted: true, apiKeys: "Raw keys are never stored. Restored hashed keys are disabled and must be rotated.", environment: "Variable names only; secret values excluded." }, media: { included: Boolean(options.includeMedia) } };
  entry(archive, "manifest.json", jsonValue(manifest)); entry(archive, "config/site.json", jsonValue(siteConfig));
  entry(archive, "config/environment-keys.txt", ["DATABASE_URL", "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "CLERK_SECRET_KEY", "BLOB_READ_WRITE_TOKEN", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN", "API_KEY_PEPPER", "CRON_SECRET", "EXPO_PUBLIC_API_URL", "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY"].join("\n"));
  for (const dataset of datasets) { entry(archive, `database/json/${dataset.name}.json`, jsonValue(dataset.rows)); entry(archive, `database/csv/${dataset.name}.csv`, datasetCsv(dataset)); }
  entry(archive, "database/data.sql", ["BEGIN;", ...datasets.map(datasetSql), "COMMIT;"].join("\n\n"));
  try { const migrationDir = path.join(process.cwd(), "drizzle"); for (const filename of (await readdir(migrationDir)).filter((name) => name.endsWith(".sql")).sort()) entry(archive, `database/migrations/${filename}`, await readFile(path.join(migrationDir, filename))); } catch { entry(archive, "database/migrations/README.txt", "Migration source files were unavailable in this runtime. Use the repository drizzle directory."); }
  let mediaBytes = 0; const maxBytes = options.maxBytes ?? Number(process.env.BACKUP_MAX_BYTES ?? 100_000_000);
  if (options.includeMedia && process.env.BLOB_READ_WRITE_TOKEN) {
    let cursor: string | undefined;
    do { const page = await list({ cursor, limit: 1000 }); for (const blob of page.blobs.filter((item) => !item.pathname.startsWith("backups/"))) { if (mediaBytes + blob.size > maxBytes) throw new Error(`Media exceeds the configured ${maxBytes} byte backup limit`); const response = await fetch(blob.url); if (!response.ok) throw new Error(`Could not download Blob media: ${blob.pathname}`); const body = Buffer.from(await response.arrayBuffer()); mediaBytes += body.length; entry(archive, `media/files/${blob.pathname}`, body); entry(archive, `media/metadata/${encodeURIComponent(blob.pathname)}.json`, jsonValue(blob)); } cursor = page.hasMore ? page.cursor : undefined; } while (cursor);
  }
  entry(archive, "RESTORE.md", `# Harborline restore\n\n1. Decrypt and unpack with \`pnpm backup:restore -- --input <file> --output <directory>\`.\n2. Create a PostgreSQL database and apply database/migrations in order.\n3. Apply database/data.sql with psql, or import the JSON/CSV files.\n4. Upload media/files to any object store and update media URLs if the host changes.\n5. Recreate the environment variables listed in config/environment-keys.txt with new secret values.\n6. Rotate every API key, Clerk secret, Blob token, database credential, cron secret and signing pepper.\n7. Run migrations, validation checks and a private preview before changing DNS.\n`);
  const tar = await collectArchive(archive); const compressed = await gzipAsync(tar, { level: 9 }); const plaintextChecksum = createHash("sha256").update(compressed).digest("hex");
  const salt = randomBytes(16); const iv = randomBytes(12); const key = scryptSync(options.passphrase, salt, 32); const cipher = createCipheriv("aes-256-gcm", key, iv); const ciphertext = Buffer.concat([cipher.update(compressed), cipher.final()]); const header = { format, cipher: "aes-256-gcm", kdf: "scrypt", salt: salt.toString("base64"), iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64"), plaintextSha256: plaintextChecksum, createdAt: manifest.createdAt }; const output = Buffer.concat([Buffer.from(`${JSON.stringify(header)}\n`), ciphertext]);
  return { buffer: output, checksumSha256: createHash("sha256").update(output).digest("hex"), manifest, mediaBytes };
}

export async function decryptPortableBackup(input: Buffer, passphrase: string) { const split = input.indexOf(10); if (split < 0) throw new Error("Invalid Harborline backup header"); const header = JSON.parse(input.subarray(0, split).toString("utf8")) as { format: string; salt: string; iv: string; tag: string; plaintextSha256: string }; if (header.format !== format) throw new Error("Unsupported backup format"); const key = scryptSync(passphrase, Buffer.from(header.salt, "base64"), 32); const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(header.iv, "base64")); decipher.setAuthTag(Buffer.from(header.tag, "base64")); const compressed = Buffer.concat([decipher.update(input.subarray(split + 1)), decipher.final()]); const checksum = createHash("sha256").update(compressed).digest("hex"); if (checksum !== header.plaintextSha256) throw new Error("Backup integrity check failed"); return gunzipAsync(compressed); }
