/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: { ecmaVersion: 2022, sourceType: "module", ecmaFeatures: { jsx: true } },
  plugins: ["@typescript-eslint"],
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended", "prettier"],
  env: { browser: true, node: true, es2022: true },
  rules: {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    "no-console": ["warn", { allow: ["warn", "error"] }]
  },
  overrides: [
    {
      files: ["*.cjs"],
      env: { node: true },
      rules: { "@typescript-eslint/no-require-imports": "off" }
    }
  ],
  ignorePatterns: ["dist", "node_modules", ".turbo"]
};
