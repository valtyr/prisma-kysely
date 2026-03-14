import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores([
    "prisma/**/*.ts",
    "**/*.test.ts",
    "./eslint.config.mjs",
    "./vitest.config.mts",
  ]),
  tseslint.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.json",
      },
    },

    rules: {
      "@typescript-eslint/consistent-type-imports": "warn",
    },
  },
]);
