# Lottie and artwork migration

`inspectLottie` produces one result per layer/effect using: fully supported, approximated, converted, rasterized, ignored with warning, or unsupported with error. It does not silently discard effects or execute expressions. Full Lottie conversion is not yet implemented.

The SVG importer converts static paths/rectangles, removes active content, and reports filters/foreign objects/animation as unsupported. The dotLottie inspector recognizes the ZIP container but requires an optional archive/manifest importer. PNG/JPEG/WebP inputs are signature/size checked; decoding stays renderer-owned.
