// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const tseslint = require('typescript-eslint');
const prettierConfig = require('eslint-config-prettier');

module.exports = defineConfig([
  {
    ignores: ['dist/', 'coverage/', 'android/', 'ios/', '.expo/', 'expo-env.d.ts'],
  },
  expoConfig,
  {
    files: ['**/*.ts', '**/*.tsx'],
    extends: [tseslint.configs.recommended],
  },
  // Último: apaga las reglas de formato que pisan a Prettier.
  prettierConfig,
]);
