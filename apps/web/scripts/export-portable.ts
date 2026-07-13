import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createPortableBackup } from "../src/lib/portable-backup";
function arg(name: string) { const index = process.argv.indexOf(name); return index >= 0 ? process.argv[index + 1] : undefined; }
const passphrase = arg('--passphrase') ?? process.env.BACKUP_PASSPHRASE; if (!passphrase) throw new Error('Set BACKUP_PASSPHRASE or pass --passphrase. Avoid placing secrets in shared shell history.');
const filename = `harborline-${new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-')}.hlnbackup`; const output = path.resolve(arg('--output') ?? path.join('backups', filename));
const result = await createPortableBackup({ passphrase, includeMedia: !process.argv.includes('--no-media'), maxBytes: Number(process.env.BACKUP_MAX_BYTES ?? 1_000_000_000) }); await mkdir(path.dirname(output), { recursive: true }); await writeFile(output, result.buffer); console.log(JSON.stringify({ output, bytes: result.buffer.length, checksumSha256: result.checksumSha256, mediaBytes: result.mediaBytes }, null, 2));
