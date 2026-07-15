import assert from "node:assert/strict";
import test from "node:test";
import { compileAnimation } from "../src/animation/compiler";
import { inspectDotLottie, inspectLottie, importImage, importSvg } from "../src/importers/index";
import { AnimationLanguageService } from "../src/tooling/language-service";

test("SVG importer produces compilable source and reports active content", () => {
  const result = importSvg('<svg><script>alert(1)</script><rect id="card" x="1" y="2" width="30" height="40" fill="#112233"/></svg>');
  assert.ok(result.source); assert.doesNotThrow(() => compileAnimation(result.source!));
  assert.ok(result.report.some((item) => item.disposition === "ignored_with_warning"));
  assert.ok(result.report.some((item) => item.disposition === "fully_supported"));
});

test("Lottie compatibility never silently drops unsupported effects", () => {
  const result = inspectLottie({ fr: 60, layers: [{ ty: 4, nm: "Shape", ef: [{ ty: 99 }] }, { ty: 13, nm: "Camera" }] });
  assert.equal(result.source, null);
  assert.ok(result.report.some((item) => item.source.endsWith(".effects") && item.disposition === "unsupported_with_error"));
  assert.ok(result.report.some((item) => item.source === "Camera" && item.disposition === "unsupported_with_error"));
});

test("dotLottie and raster importers provide explicit compatibility results", () => {
  assert.equal(inspectDotLottie(new Uint8Array([0x50, 0x4b, 3, 4])).report[0]?.disposition, "ignored_with_warning");
  assert.equal(importImage("pixel.png", new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0])).assets[0]?.mimeType, "image/png");
  assert.equal(importImage("unknown", new Uint8Array([1, 2, 3])).report[0]?.disposition, "unsupported_with_error");
});

test("language service completes, formats, navigates, references, and renames", () => {
  const source = `language 1\npackage sample;\nscene Demo {\n  input title: string = "Hi";\n  component label text { text: "\${title}"; opacity: 1; }\n  timeline show 100ms { track label.opacity { 0ms: 0; 100ms: 1 ease linear; } }\n}`;
  const service = new AnimationLanguageService();
  assert.ok(service.complete(source, source.length).some((item) => item.label === "scene"));
  const labelReference = source.lastIndexOf("label.opacity");
  assert.equal(service.definition(source, labelReference + 2)?.kind, "component");
  assert.ok(service.references(source, labelReference + 2).length >= 2);
  assert.ok(service.rename(source, labelReference + 2, "headline").length >= 2);
  assert.equal(service.format(service.format(source)), service.format(source));
  assert.deepEqual(service.validate(source), []);
});
