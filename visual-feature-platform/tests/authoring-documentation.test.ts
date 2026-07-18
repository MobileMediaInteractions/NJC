import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { componentRegistry } from "@visual-feature/model";

const documentationUrl = new URL("../docs/language/authoring-language-and-blueprints.md", import.meta.url);

test("complete authoring guide covers the implemented component and Blueprint catalogs", async () => {
  const documentation = await readFile(documentationUrl, "utf8");
  for (const component of componentRegistry) {
    const sourceType = component.type.replace("text-field", "text field").replace("navigation-bar", "navigation bar");
    assert.ok(documentation.includes(`| \`${sourceType}\` |`), `missing component '${component.type}'`);
  }
  for (const nodeKind of ["event", "ask", "set-state", "action", "condition", "show", "hide", "navigate", "animation", "wait", "emit", "error", "parallel"]) {
    assert.ok(documentation.includes(`| \`${nodeKind}\` |`), `missing node kind '${nodeKind}'`);
  }
  for (const portType of ["control", "text", "number", "boolean", "money", "image", "video", "record", "list", "error", "result", "event", "any"]) {
    assert.ok(documentation.includes(`| \`${portType}\` |`), `missing port type '${portType}'`);
  }
  assert.match(documentation, /Current editing boundaries/);
  assert.match(documentation, /Complete example/);
});
