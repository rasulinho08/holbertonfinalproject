// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'node_modules/*', 'e2e/screenshots/*', '.expo/*'],
  },
  {
    rules: {
      // The mock API deliberately uses `any` at the route-handler boundary,
      // where request bodies are untyped by definition.
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
]);
