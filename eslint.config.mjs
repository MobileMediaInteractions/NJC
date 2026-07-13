import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["apps/tv/**/*.{ts,tsx}"],
    rules: { "@next/next/no-html-link-for-pages": "off" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "apps/mobile/dist/**",
    "apps/mobile/.expo/**",
    "apps/tv/dist/**",
    "apps/tv/.expo/**",
    "apps/tv/ios/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
