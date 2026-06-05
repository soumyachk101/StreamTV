import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // The following patterns are intentional in this project:
      // - Sync localStorage state to React state
      // - Mount-time data fetching
      // - Pathname-driven resets
      // The cascading render warning is not actionable for these cases.
      "react-hooks/set-state-in-effect": "off",
      // Image optimization is handled separately; the project is fine with img tags for now.
      "@next/next/no-img-element": "warn",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
