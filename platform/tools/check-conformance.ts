import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { compileAnimation } from "../src/animation/compiler";
import { sha256Hex } from "../src/core/sha256";
import { languageKeywords } from "../src/tooling/language-service";

const root = new URL("../", import.meta.url);
const schema = await readFile(fileURLToPath(new URL("schemas/animation-binary/animation-package.fbs", root)));
const expectedHash = (await readFile(fileURLToPath(new URL("schemas/animation-binary/animation-package.fbs.sha256", root)), "utf8")).trim();
assert.equal(sha256Hex(schema), expectedHash, "FlatBuffers schema changed; update bindings/accessors, compatibility tests, ADR, then intentionally refresh the hash");
const textMate = await readFile(fileURLToPath(new URL("tooling/vscode/syntaxes/pani.tmLanguage.json", root)), "utf8");
const treeSitter = await readFile(fileURLToPath(new URL("tooling/tree-sitter-pani/grammar.js", root)), "utf8");
for (const keyword of languageKeywords) {
  assert.ok(textMate.includes(keyword), `TextMate grammar is missing ${keyword}`);
  assert.ok(treeSitter.includes(`"${keyword}"`) || treeSitter.includes(keyword), `Tree-sitter grammar is missing ${keyword}`);
}
const source = await readFile(fileURLToPath(new URL("examples/animation-showcase/welcome.pani", root)), "utf8");
assert.deepEqual(compileAnimation(source).packageBytes, compileAnimation(source).packageBytes, "Compiler output is not deterministic");
process.stdout.write(`Conformance passed: schema ${expectedHash.slice(0, 12)}, ${languageKeywords.length} grammar keywords, deterministic package.\n`);
