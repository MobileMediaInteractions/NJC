# Lottie translation kit

The translation kit turns a bounded Lottie `.json` document into canonical `.pani` source without requiring the original After Effects project. It uses two honest modes: supported objects become granular native PANI components, while valid advanced documents are preserved byte-for-byte in meaning as a single embedded `lottie` component and rendered by the Lottie engine. Use `importLottie` from `@platform/runtime/importers`; `inspectLottie` is retained as a compatibility alias. NJC Studio exposes the same pipeline through **Import** and always shows its compatibility report.

The importer performs structural and compatibility validation against the Lottie concepts it consumes. It is deliberately not a claim of universal conformance with every revision and extension in the complete Lottie JSON schema. The upstream references are the [Lottie community specification](https://github.com/lottie-animation-community/docs/blob/main/Lottie_Specification.md) and its [generated JSON schema](https://lottiefiles.github.io/lottie-docs/schema/).

## Translation pipeline

1. Bound the UTF-8 JSON input to 10 MiB, 250,000 visited values, 64 levels of nesting and 2,000 layers.
2. Parse JSON and require a root object, canvas width/height, frame rate, in/out points and layer array.
3. Reject expression strings before translation. Imported data is never evaluated as JavaScript.
4. Inspect every visible layer for masks, mattes, effects, parenting, 3D state, time stretching and blend modes.
5. Translate the supported subset into granular components plus deterministic millisecond keyframes.
6. If a valid document contains advanced Lottie structures, preserve the complete canonical JSON as base64 in a `lottie` component. Expressions remain blocked, and unresolved companion-file/external image assets are rejected because they cannot be made self-contained.
7. Return source only when the generated source remains within the PANI compiler's 1 MiB limit.
8. Compile the generated source in the platform test suite. Studio writes it as a new file and never overwrites the external Lottie original.

## Current compatibility

| Lottie feature | Result in PANI language 1 |
| --- | --- |
| Solid layers | Editable `rect` component |
| Shape rectangles | Editable `rect` component |
| Ellipses | Editable rounded rectangle; reported as an approximation |
| Static Bezier paths | Editable `path` with SVG-compatible path data |
| Static fill or stroke | Color, path mode and stroke width |
| Static text | Editable `text`, size and color; font metrics may differ |
| Embedded PNG/JPEG/WebP/GIF data URI | Editable `image` component, 512 KiB source limit |
| Absolute HTTPS image | Editable `image` source; runtime loading remains subject to network/CORS policy |
| Position, opacity, rotation, uniform scale | Static values and numeric keyframes |
| Hold keyframes | `steps1` easing |
| Cubic temporal easing | Converted to linear and explicitly reported as an approximation |
| Layer in/out visibility | Deterministic opacity steps for static-opacity layers |
| Hidden and unparented null layers | Omitted with a warning |
| Nested groups with identity transforms | Flattened with a warning |
| Non-uniform scale | Averaged to uniform scale with a warning |
| Parenting, transformed groups, precompositions, masks/mattes, repeaters, trim/merge paths, gradients and advanced shape animation | Complete validated JSON preserved in one editable `lottie` component; faithful Studio playback and video rendering use `lottie-web` |

Expressions, malformed/over-limit documents, unresolved companion-file assets, unsafe external asset references and embedded sources larger than the compiler limit still stop import. Advanced Lottie structures do not get flattened or silently approximated: they trigger lossless mode. The embedded component is editable as a whole (transform, timing and source data), but its internal After Effects layer graph is not falsely exposed as independently editable PANI shapes.

## Result contract

```ts
import { importLottie } from "@platform/runtime/importers";

const translated = importLottie(jsonText, {
  sourceName: "weekly-pulse.json",
  packageName: "weekly_pulse",
  sceneName: "WeeklyPulse",
});

if (translated.source) {
  // Save as weekly-pulse.pani and edit normally.
} else {
  // Show translated.report; no partial source should be treated as usable.
}
```

Set `losslessFallback: false` for tooling that specifically needs strict granular conversion and should reject any feature outside that subset.

`report` uses the dispositions `fully_supported`, `converted`, `approximated`, `rasterized`, `ignored_with_warning`, and `unsupported_with_error`. `summary` records validation state, source version, canvas, timing, layer/component counts, warnings and blocking errors.

## Other artwork importers

The SVG importer converts static paths and rectangles, removes active content, and reports filters, foreign objects and animation as unsupported. The dotLottie inspector recognizes the ZIP container but still requires a dedicated archive/manifest selector. PNG/JPEG/WebP inputs are signature and size checked; decoding stays renderer-owned.
