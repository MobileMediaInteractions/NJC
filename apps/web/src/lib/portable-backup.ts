import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { gzip, gunzip } from "node:zlib";
import { promisify } from "node:util";
import { getTableColumns } from "drizzle-orm";
import { get, list } from "@vercel/blob";
import pack from "tar-stream";
import { getDb, hasDatabase } from "@harborline/backend/db";
import * as schema from "@harborline/backend/schema";
import { getPrivateBlobToken, getPublicBlobToken } from "@/lib/blob-storage";
import { siteConfig } from "@/lib/site";

const gzipAsync = promisify(gzip); const gunzipAsync = promisify(gunzip);
const format = "harborline-portable-backup-v1";
type Dataset = { name: string; table: Parameters<typeof getTableColumns>[0]; rows: Record<string, unknown>[] };

function toRecordRows(rows: unknown[]) { return rows.map((row) => ({ ...(row as Record<string, unknown>) })); }
function sanitize(name: string, rows: Record<string, unknown>[]) {
  if (name === "api_keys") return rows.map((row) => ({ ...row, keyHash: "DISABLED_AFTER_RESTORE", revokedAt: row.revokedAt ?? new Date().toISOString() }));
  if (name === "data_requests") return rows.map((row) => ({ ...row, verificationTokenHash: null }));
  if (name === "device_pairing_requests") return rows.map((row) => ({ ...row, deviceSecretHash: "REMOVED", userCodeHash: "REMOVED", requesterIpHash: "REMOVED", status: "expired" }));
  if (name === "device_sessions") return rows.map((row) => ({ ...row, tokenHash: "REMOVED", revokedAt: row.revokedAt ?? new Date().toISOString() }));
  if (name === "push_devices" || name === "employee_push_devices") return rows.map((row) => ({ ...row, token: "REMOVED", isActive: false }));
  if (name === "platform_licenses") return rows.map((row) => ({ ...row, keyHash: null, status: "revoked", revokedAt: row.revokedAt ?? new Date().toISOString() }));
  if (name === "platform_installations") return rows.map((row) => ({ ...row, pseudonymousDeviceIdHash: "REMOVED", deactivatedAt: row.deactivatedAt ?? new Date().toISOString() }));
  if (name === "platform_signing_keys") return rows.map((row) => ({ ...row, privateKeyReference: "REMOVED", status: "retired", retiredAt: row.retiredAt ?? new Date().toISOString() }));
  if (name === "platform_webhooks") return rows.map((row) => ({ ...row, secretReference: "REMOVED", isActive: false }));
  return rows;
}

async function readDatasets(): Promise<Dataset[]> {
  if (!hasDatabase()) throw new Error("DATABASE_URL is required for a portable backup"); const db = getDb();
  const data = await Promise.all([
    db.select().from(schema.users), db.select().from(schema.categories), db.select().from(schema.stories), db.select().from(schema.storyRevisions),
    db.select().from(schema.mediaAssets), db.select().from(schema.assignments), db.select().from(schema.comments), db.select().from(schema.newsletterSubscribers),
    db.select().from(schema.alerts), db.select().from(schema.liveEvents), db.select().from(schema.newsTips), db.select().from(schema.pressKitRequests), db.select().from(schema.apiKeys),
    db.select().from(schema.apiAuditLogs), db.select().from(schema.pushDevices), db.select().from(schema.audienceInstallations), db.select().from(schema.siteSettings), db.select().from(schema.dataRequests),
    db.select().from(schema.portableExports), db.select().from(schema.devicePairingRequests), db.select().from(schema.deviceSessions),
    db.select().from(schema.employeeCapabilityGrants), db.select().from(schema.employeeAccessRequests), db.select().from(schema.employeeChatChannels),
    db.select().from(schema.employeeChatMembers), db.select().from(schema.employeeChatMessages), db.select().from(schema.employeeChatAttachments),
    db.select().from(schema.employeeChatReports), db.select().from(schema.employeePresence), db.select().from(schema.employeePushDevices),
    db.select().from(schema.employeeNotifications), db.select().from(schema.employeeAuditLogs),
    db.select().from(schema.platformOrganizations), db.select().from(schema.platformCustomers), db.select().from(schema.platformProducts),
    db.select().from(schema.platformFeatureModules), db.select().from(schema.platformApplications), db.select().from(schema.platformApplicationIdentities),
    db.select().from(schema.platformPlans), db.select().from(schema.platformPlanEntitlements), db.select().from(schema.platformLicenses),
    db.select().from(schema.platformLicenseVersions), db.select().from(schema.platformSeats), db.select().from(schema.platformInstallations),
    db.select().from(schema.platformActivations), db.select().from(schema.platformOfflineLeases), db.select().from(schema.platformSigningKeys),
    db.select().from(schema.platformLicenseAudit), db.select().from(schema.platformWebhooks), db.select().from(schema.platformIdempotencyRecords),
    db.select().from(schema.platformUsageReports),
  ]);
  const definitions = [
    ["users", schema.users], ["categories", schema.categories], ["stories", schema.stories], ["story_revisions", schema.storyRevisions],
    ["media_assets", schema.mediaAssets], ["assignments", schema.assignments], ["comments", schema.comments], ["newsletter_subscribers", schema.newsletterSubscribers],
    ["alerts", schema.alerts], ["live_events", schema.liveEvents], ["news_tips", schema.newsTips], ["press_kit_requests", schema.pressKitRequests], ["api_keys", schema.apiKeys],
    ["api_audit_logs", schema.apiAuditLogs], ["push_devices", schema.pushDevices], ["audience_installations", schema.audienceInstallations], ["site_settings", schema.siteSettings], ["data_requests", schema.dataRequests],
    ["portable_exports", schema.portableExports], ["device_pairing_requests", schema.devicePairingRequests], ["device_sessions", schema.deviceSessions],
    ["employee_capability_grants", schema.employeeCapabilityGrants], ["employee_access_requests", schema.employeeAccessRequests], ["employee_chat_channels", schema.employeeChatChannels],
    ["employee_chat_members", schema.employeeChatMembers], ["employee_chat_messages", schema.employeeChatMessages], ["employee_chat_attachments", schema.employeeChatAttachments],
    ["employee_chat_reports", schema.employeeChatReports], ["employee_presence", schema.employeePresence], ["employee_push_devices", schema.employeePushDevices],
    ["employee_notifications", schema.employeeNotifications], ["employee_audit_logs", schema.employeeAuditLogs],
    ["platform_organizations", schema.platformOrganizations], ["platform_customers", schema.platformCustomers], ["platform_products", schema.platformProducts],
    ["platform_feature_modules", schema.platformFeatureModules], ["platform_applications", schema.platformApplications], ["platform_application_identities", schema.platformApplicationIdentities],
    ["platform_plans", schema.platformPlans], ["platform_plan_entitlements", schema.platformPlanEntitlements], ["platform_licenses", schema.platformLicenses],
    ["platform_license_versions", schema.platformLicenseVersions], ["platform_seats", schema.platformSeats], ["platform_installations", schema.platformInstallations],
    ["platform_activations", schema.platformActivations], ["platform_offline_leases", schema.platformOfflineLeases], ["platform_signing_keys", schema.platformSigningKeys],
    ["platform_license_audit", schema.platformLicenseAudit], ["platform_webhooks", schema.platformWebhooks], ["platform_idempotency_records", schema.platformIdempotencyRecords],
    ["platform_usage_reports", schema.platformUsageReports],
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
  entry(archive, "config/environment-keys.txt", ["DATABASE_URL", "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "CLERK_SECRET_KEY", "BLOB_READ_WRITE_TOKEN", "PRIVATE_BLOB_READ_WRITE_TOKEN", "PRIVATE_BLOB_STORE_ID", "KV_REST_API_URL", "KV_REST_API_TOKEN", "KV_REST_API_READ_ONLY_TOKEN", "KV_URL", "REDIS_URL", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN", "API_KEY_PEPPER", "DEVICE_PAIRING_PEPPER", "CRON_SECRET", "EXPO_PUBLIC_API_URL", "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY", "EXPO_PUBLIC_TV_API_URL", "EXPO_PUBLIC_EMPLOYEE_API_URL", "EXPO_PUBLIC_EMPLOYEE_LINK_HOST", "EMPLOYEE_MIN_APP_VERSION", "EMPLOYEE_IOS_INSTALL_URL", "EMPLOYEE_ANDROID_INSTALL_URL", "EMPLOYEE_INTERNAL_INSTALL_URL", "EMPLOYEE_IOS_APP_ID", "EMPLOYEE_ANDROID_PACKAGE", "EMPLOYEE_ANDROID_SHA256_CERT_FINGERPRINTS", "PLATFORM_LICENSE_ISSUER", "PLATFORM_LICENSE_AUDIENCE", "PLATFORM_LICENSE_KEY_ID", "PLATFORM_ED25519_PRIVATE_KEY_PEM", "PLATFORM_ED25519_PUBLIC_KEY_PEM", "PLATFORM_ED25519_PREVIOUS_PUBLIC_KEYS_JSON", "PLATFORM_LICENSE_KEY_PEPPER", "PLATFORM_INSTALLATION_PEPPER"].join("\n"));
  for (const dataset of datasets) { entry(archive, `database/json/${dataset.name}.json`, jsonValue(dataset.rows)); entry(archive, `database/csv/${dataset.name}.csv`, datasetCsv(dataset)); }
  entry(archive, "database/data.sql", ["BEGIN;", ...datasets.map(datasetSql), "COMMIT;"].join("\n\n"));
  try { const migrationDir = path.join(process.cwd(), "drizzle"); for (const filename of (await readdir(migrationDir)).filter((name) => name.endsWith(".sql")).sort()) entry(archive, `database/migrations/${filename}`, await readFile(path.join(migrationDir, filename))); } catch { entry(archive, "database/migrations/README.txt", "Migration source files were unavailable in this runtime. Use the repository drizzle directory."); }
  let mediaBytes = 0; const maxBytes = options.maxBytes ?? Number(process.env.BACKUP_MAX_BYTES ?? 100_000_000);
  if (options.includeMedia) {
    const stores = [
      { access: "public" as const, token: getPublicBlobToken() },
      { access: "private" as const, token: getPrivateBlobToken() },
    ].filter((store): store is { access: "public" | "private"; token: string } => Boolean(store.token));
    for (const store of stores) {
      let cursor: string | undefined;
      do {
        const page = await list({ cursor, limit: 1000, token: store.token });
        for (const blob of page.blobs.filter((item) => !item.pathname.startsWith("backups/"))) {
          if (mediaBytes + blob.size > maxBytes) throw new Error(`Media exceeds the configured ${maxBytes} byte backup limit`);
          let body: Buffer;
          if (store.access === "private") {
            const privateBlob = await get(blob.pathname, { access: "private", token: store.token });
            if (!privateBlob || privateBlob.statusCode !== 200) throw new Error(`Could not download private Blob media: ${blob.pathname}`);
            body = Buffer.from(await new Response(privateBlob.stream).arrayBuffer());
          } else {
            const response = await fetch(blob.url);
            if (!response.ok) throw new Error(`Could not download public Blob media: ${blob.pathname}`);
            body = Buffer.from(await response.arrayBuffer());
          }
          mediaBytes += body.length;
          entry(archive, `media/files/${store.access}/${blob.pathname}`, body);
          entry(archive, `media/metadata/${store.access}/${encodeURIComponent(blob.pathname)}.json`, jsonValue({ ...blob, access: store.access }));
        }
        cursor = page.hasMore ? page.cursor : undefined;
      } while (cursor);
    }
  }
  entry(archive, "RESTORE.md", `# The New Jersey Courier restore\n\n1. Decrypt and unpack with \`pnpm backup:restore -- --input <file> --output <directory>\`.\n2. Create a PostgreSQL database and apply database/migrations in order.\n3. Apply database/data.sql with psql, or import the JSON/CSV files.\n4. Upload media/files/public to a public object store and media/files/private to an authenticated private store, then update media URLs if the host changes.\n5. Recreate the environment variables listed in config/environment-keys.txt with new secret values.\n6. Rotate every API key, Clerk secret, Blob token, database credential, cron secret and signing pepper.\n7. Run migrations, validation checks and a private preview before changing DNS.\n`);
  const tar = await collectArchive(archive); const compressed = await gzipAsync(tar, { level: 9 }); const plaintextChecksum = createHash("sha256").update(compressed).digest("hex");
  const salt = randomBytes(16); const iv = randomBytes(12); const key = scryptSync(options.passphrase, salt, 32); const cipher = createCipheriv("aes-256-gcm", key, iv); const ciphertext = Buffer.concat([cipher.update(compressed), cipher.final()]); const header = { format, cipher: "aes-256-gcm", kdf: "scrypt", salt: salt.toString("base64"), iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64"), plaintextSha256: plaintextChecksum, createdAt: manifest.createdAt }; const output = Buffer.concat([Buffer.from(`${JSON.stringify(header)}\n`), ciphertext]);
  return { buffer: output, checksumSha256: createHash("sha256").update(output).digest("hex"), manifest, mediaBytes };
}

export async function decryptPortableBackup(input: Buffer, passphrase: string) { const split = input.indexOf(10); if (split < 0) throw new Error("Invalid The New Jersey Courier backup header"); const header = JSON.parse(input.subarray(0, split).toString("utf8")) as { format: string; salt: string; iv: string; tag: string; plaintextSha256: string }; if (header.format !== format) throw new Error("Unsupported backup format"); const key = scryptSync(passphrase, Buffer.from(header.salt, "base64"), 32); const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(header.iv, "base64")); decipher.setAuthTag(Buffer.from(header.tag, "base64")); const compressed = Buffer.concat([decipher.update(input.subarray(split + 1)), decipher.final()]); const checksum = createHash("sha256").update(compressed).digest("hex"); if (checksum !== header.plaintextSha256) throw new Error("Backup integrity check failed"); return gunzipAsync(compressed); }
