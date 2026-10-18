/* ESLint: `npm run lint` (also run by CI on every push). */
import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";

export default [
  { ignores: ["dist/", "node_modules/", "docs/"] },
  js.configs.recommended,
  {
    files: ["src/**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { "react-hooks": reactHooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      /* Components are used as <Name />, which core ESLint doesn't count as
         a use; capitalised names are therefore exempt. */
      "no-unused-vars": ["error", { varsIgnorePattern: "^[A-Z]", argsIgnorePattern: "^_", caughtErrors: "none" }],
    },
  },
  {
    files: ["server/**/*.js", "api/**/*.js", "vite.config.js", "eslint.config.js"],
    languageOptions: { ecmaVersion: "latest", sourceType: "module", globals: globals.node },
    rules: { "no-unused-vars": ["error", { argsIgnorePattern: "^_", caughtErrors: "none" }] },
  },
  { files: ["public/sw.js"], languageOptions: { sourceType: "script", globals: globals.serviceworker } },
  { files: ["public/*-init.js"], languageOptions: { sourceType: "script", globals: globals.browser } },
];
