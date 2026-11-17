import { defineConfig, globalIgnores } from "eslint/config";
import js from "@eslint/js";
import ts from "typescript-eslint";
import next from "@next/eslint-plugin-next";
import hooks from "eslint-plugin-react-hooks";
import globals from "globals";

export default defineConfig([
  globalIgnores([".next/**", "next-env.d.ts"]),
  js.configs.recommended,
  ts.configs.recommended,
  { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
  {
    files: ["**/*.tsx"],
    extends: [next.configs["core-web-vitals"], hooks.configs.flat.recommended],
  },
]);
