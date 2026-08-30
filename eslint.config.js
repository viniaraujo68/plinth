import { defineConfig, includeIgnoreFile } from "eslint/config";
import prettier from "eslint-config-prettier";
import svelte from "eslint-plugin-svelte";
import globals from "globals";
import ts from "typescript-eslint";
import js from "@eslint/js";
import path from "node:path";

const gitignorePath = path.resolve(import.meta.dirname, ".gitignore");

export default defineConfig(
  includeIgnoreFile(gitignorePath),
  js.configs.recommended,
  prettier,
  ts.configs.strictTypeChecked,
  ts.configs.stylisticTypeChecked,
  svelte.configs.recommended,
  svelte.configs.prettier,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { projectService: true, parser: ts.parser },
    },
  },
  {
    rules: {
      // A library gets called from untyped code, so a nullish coalescing fallback is a real
      // guard rather than dead code -- but an assertion that a value cannot be null still has to
      // be justified by the surrounding logic, never stacked on top of one of those fallbacks.
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-non-null-asserted-nullish-coalescing": "error",
      // Svelte event handlers and effects are void-returning by contract; an arrow that forwards
      // the result of a void call is idiomatic there.
      "@typescript-eslint/no-confusing-void-expression": "off",
      "@typescript-eslint/no-misused-promises": ["error", { checksVoidReturn: false }],
      // Public props and context shapes are interfaces so a consumer can declaration-merge them.
      "@typescript-eslint/consistent-type-definitions": ["error", "interface"],
      // Property signatures are checked bivariantly-free, which matters for callbacks a consumer
      // supplies to a component.
      "@typescript-eslint/method-signature-style": ["error", "property"],
      "@typescript-eslint/no-unnecessary-boolean-literal-compare": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/prefer-for-of": "error",
      "@typescript-eslint/prefer-includes": "error",
      "@typescript-eslint/prefer-string-starts-ends-with": "error",
      "@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true }],
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          args: "all",
          argsIgnorePattern: "^_",
          caughtErrors: "all",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
      // Shadowing is how `$derived` chains and snippet parameters read best in Svelte.
      "no-shadow": "off",
      "no-implicit-coercion": "error",
      "no-nested-ternary": "error",
      curly: ["error", "multi", "consistent"],
    },
  },
  {
    files: ["**/*.svelte", "**/*.svelte.ts", "**/*.svelte.js"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        extraFileExtensions: [".svelte"],
        parser: ts.parser,
      },
    },
    rules: {
      ...ts.configs.disableTypeChecked.rules,
      // svelte-eslint-parser does not feed the compiler-generated globals ($props, $state, ...)
      // to the core scope analyser; svelte-check is what actually type-checks these files.
      "no-undef": "off",
    },
  },
  {
    files: ["**/*.{test,spec,e2e}.{js,ts}"],
    extends: [ts.configs.disableTypeChecked],
  },
  {
    files: ["*.config.{js,ts}"],
    extends: [ts.configs.disableTypeChecked],
  },
);
