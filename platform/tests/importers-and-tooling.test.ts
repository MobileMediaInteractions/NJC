import assert from "node:assert/strict";
import test from "node:test";
import { compileAnimation } from "../src/animation/compiler";
import { importLottie, inspectDotLottie, inspectLottie, importImage, importSvg } from "../src/importers/index";
import { AnimationLanguageService } from "../src/tooling/language-service";

test("SVG importer produces compilable source and reports active content", () => {
  const result = importSvg('<svg><script>alert(1)</script><rect id="card" x="1" y="2" width="30" height="40" fill="#112233"/></svg>');
  assert.ok(result.source); assert.doesNotThrow(() => compileAnimation(result.source!));
  assert.ok(result.report.some((item) => item.disposition === "ignored_with_warning"));
  assert.ok(result.report.some((item) => item.disposition === "fully_supported"));
});

test("strict Lottie compatibility mode never silently drops unsupported effects", () => {
  const result = importLottie({ v: "5.12.2", w: 100, h: 100, fr: 60, ip: 0, op: 60, layers: [{ ty: 4, nm: "Shape", ef: [{ ty: 99 }] }, { ty: 13, nm: "Camera" }] }, { losslessFallback: false });
  assert.equal(result.source, null);
  assert.ok(result.report.some((item) => item.source.endsWith(".effects") && item.disposition === "unsupported_with_error"));
  assert.ok(result.report.some((item) => item.source === "Camera" && item.disposition === "unsupported_with_error"));
});

test("advanced valid Lottie is preserved losslessly and remains compilable without its AE project", () => {
  const original = {
    v: "5.12.2", nm: "Immutable Advanced", w: 375, h: 812, fr: 30, ip: 0, op: 90,
    assets: [{ id: "comp_0", layers: [{ ty: 4, nm: "Repeated shape", shapes: [{ ty: "rp", c: { a: 0, k: 5 } }] }] }],
    layers: [
      { ty: 3, ind: 1, nm: "Controller", ks: { p: { a: 0, k: [187.5, 406] } } },
      { ty: 0, ind: 2, parent: 1, nm: "Masked precomp", refId: "comp_0", masksProperties: [{ mode: "a", pt: { a: 0, k: { v: [], i: [], o: [], c: true } } }], ks: { p: { a: 0, k: [0, 0] } } },
    ],
  };
  const translated = inspectLottie(original);
  assert.ok(translated.source);
  assert.equal(translated.summary.valid, true);
  assert.equal(translated.summary.components, 1);
  assert.ok(translated.report.some((item) => item.source === "editable source" && item.disposition === "converted"));
  const compiled = compileAnimation(translated.source!);
  assert.ok(compiled.compiled.requiredFeatures.includes("animation.lottie"));
  const component = compiled.compiled.scenes[0]?.components[0];
  assert.equal(component?.kind, "lottie");
  const encoded = component?.properties.lottieData?.value;
  assert.equal(typeof encoded, "string");
  assert.deepEqual(JSON.parse(Buffer.from(encoded as string, "base64").toString("utf8")), original);
});

test("validated Lottie layers translate into editable, compilable PANI source", () => {
  const translated = importLottie({
    v: "5.12.2", nm: "Courier Pulse", w: 390, h: 844, fr: 30, ip: 0, op: 60,
    layers: [
      { ty: 1, nm: "Backdrop", sw: 390, sh: 844, sc: "#F4F0E8", ip: 0, op: 60, ks: { a: { a: 0, k: [0, 0] }, p: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } } },
      { ty: 4, nm: "Pulse", ip: 0, op: 60, ks: { a: { a: 0, k: [0, 0] }, p: { a: 1, k: [{ t: 0, s: [40, 80], e: [160, 80] }, { t: 60, s: [160, 80] }] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } }, shapes: [{ ty: "rc", nm: "Card", p: { a: 0, k: [0, 0] }, s: { a: 0, k: [120, 64] }, r: { a: 0, k: 12 } }, { ty: "fl", c: { a: 0, k: [0.05, 0.31, 0.23, 1] } }] },
      { ty: 5, nm: "Headline", ip: 0, op: 60, ks: { a: { a: 0, k: [0, 0] }, p: { a: 0, k: [24, 190] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 1, k: [{ t: 0, s: [0], e: [100] }, { t: 15, s: [100] }] } }, t: { d: { k: [{ t: 0, s: { t: "Garden State", s: 32, fc: [0.08, 0.15, 0.12], sz: [330, 90] } }] } } },
    ],
  }, { sourceName: "courier-pulse.json" });
  assert.ok(translated.source);
  assert.equal(translated.summary.valid, true);
  assert.equal(translated.summary.components, 3);
  assert.match(translated.source!, /timeline lottie_main 2000ms/);
  assert.doesNotThrow(() => compileAnimation(translated.source!));
  assert.ok(translated.report.some((item) => item.disposition === "converted"));
});

test("Lottie validation blocks malformed JSON and executable expressions", () => {
  assert.equal(importLottie("{not-json").summary.valid, false);
  const expression = importLottie({ v: "5.12.2", w: 100, h: 100, fr: 30, ip: 0, op: 30, layers: [{ ty: 1, nm: "Unsafe", sw: 10, sh: 10, sc: "#000000", ks: { p: { x: "time * 20" } } }] });
  assert.equal(expression.source, null);
  assert.ok(expression.report.some((item) => item.source === "expressions" && item.disposition === "unsupported_with_error"));
});

test("lossless Lottie rejects unresolved companion-file assets", () => {
  const translated = importLottie({ v: "5.12.2", w: 100, h: 100, fr: 30, ip: 0, op: 30, assets: [{ id: "image_0", p: "asset.png" }], layers: [{ ty: 2, nm: "Image", refId: "image_0", parent: 1 }] });
  assert.equal(translated.source, null);
  assert.ok(translated.report.some((item) => item.source === "document.assets" && item.disposition === "unsupported_with_error"));
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
