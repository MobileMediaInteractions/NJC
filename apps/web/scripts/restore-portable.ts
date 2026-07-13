import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import extract from "tar-stream";
import { decryptPortableBackup } from "../src/lib/portable-backup";
function arg(name: string) { const index = process.argv.indexOf(name); return index >= 0 ? process.argv[index + 1] : undefined; }
const input = arg('--input'); const output = path.resolve(arg('--output') ?? 'restored-harborline'); const passphrase = arg('--passphrase') ?? process.env.BACKUP_PASSPHRASE; if (!input || !passphrase) throw new Error('Usage: pnpm backup:restore -- --input <file> --output <directory>; set BACKUP_PASSPHRASE.');
const tar = await decryptPortableBackup(await readFile(path.resolve(input)), passphrase); const archive = extract.extract(); const pending: Promise<void>[] = [];
archive.on('entry', (header, stream, next) => { const chunks: Buffer[] = []; stream.on('data', (chunk) => chunks.push(Buffer.from(chunk))); stream.on('end', () => { const target = path.resolve(output, header.name); if (!target.startsWith(`${output}${path.sep}`)) throw new Error('Unsafe path in backup'); pending.push(mkdir(path.dirname(target), { recursive: true }).then(() => writeFile(target, Buffer.concat(chunks)))); next(); }); stream.resume(); });
const completed = new Promise<void>((resolve, reject) => { archive.on('finish', resolve); archive.on('error', reject); }); archive.end(tar); await completed; await Promise.all(pending); console.log(JSON.stringify({ restoredTo: output, next: 'Read RESTORE.md before importing data or switching traffic.' }, null, 2));
