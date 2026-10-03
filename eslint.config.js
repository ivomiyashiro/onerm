// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const tseslint = require('typescript-eslint');
const prettierConfig = require('eslint-config-prettier');
const boundaries = require('eslint-plugin-boundaries');

// Infrastructure SDKs: only data may import them (and di, which composes it).
// Closed list: when adding any persistence or network SDK (another SQLite, an HTTP client),
// add it here and in tools/lint/boundaries.test.ts.
const INFRASTRUCTURE_SDKS = [
  '@supabase/**',
  'expo-sqlite',
  'expo-sqlite/**',
  'drizzle-orm',
  'drizzle-orm/**',
];

module.exports = defineConfig([
  {
    ignores: ['dist/', 'coverage/', 'android/', 'ios/', '.expo/', 'expo-env.d.ts'],
  },
  expoConfig,
  {
    files: ['**/*.ts', '**/*.tsx'],
    extends: [tseslint.configs.recommended],
  },
  // Clean Architecture layer rules (12 §1, ADR-0011, RNF-11). Never disabled.
  {
    files: ['src/**/*.{js,jsx,ts,tsx}', 'app/**/*.{js,jsx,ts,tsx}'],
    plugins: { boundaries },
    settings: {
      'import/resolver': {
        typescript: { project: './tsconfig.json' },
      },
      'boundaries/elements': [
        // partialMatch: false: the pattern is matched against the full path from the root. Without it,
        // a src/domain/app/ folder was classified as app and inherited its permissions.
        { type: 'domain', partialMatch: false, pattern: 'src/domain/**' },
        { type: 'data', partialMatch: false, pattern: 'src/data/**' },
        { type: 'presentation', partialMatch: false, pattern: 'src/presentation/**' },
        { type: 'di', partialMatch: false, pattern: 'src/di/**' },
        { type: 'app', partialMatch: false, pattern: 'app/**' },
      ],
    },
    rules: {
      // Every file in src/ and app/ belongs to a layer: no src/shared/ or src/utils/ as a
      // bridge to bypass the rules. And no layer imports local files outside the layers.
      'boundaries/no-unknown-files': 'error',
      'boundaries/no-unknown-dependencies': 'error',
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          // Without this the rule ignores external packages and domain could import React.
          checkAllOrigins: true,
          policies: [
            // domain is pure TypeScript: no other layers and no external packages.
            {
              from: { element: { type: 'domain' } },
              allow: { to: { element: { type: 'domain' } } },
            },
            {
              from: { element: { type: 'data' } },
              allow: [
                { to: { element: { types: { anyOf: ['domain', 'data'] } } } },
                { to: { module: { origin: 'external' } } },
              ],
            },
            {
              from: { element: { type: 'presentation' } },
              allow: [
                { to: { element: { types: { anyOf: ['domain', 'presentation'] } } } },
                { to: { module: { origin: 'external' } } },
              ],
            },
            // Composition root: the only layer that knows both data and presentation.
            {
              from: { element: { type: 'di' } },
              allow: [
                { to: { element: { types: { anyOf: ['domain', 'data', 'presentation', 'di'] } } } },
                { to: { module: { origin: 'external' } } },
              ],
            },
            // Expo Router: screen composition only.
            {
              from: { element: { type: 'app' } },
              allow: [
                { to: { element: { types: { anyOf: ['domain', 'presentation', 'di', 'app'] } } } },
                { to: { module: { origin: 'external' } } },
              ],
            },
            // Goes last because the last matching policy wins.
            {
              from: { element: { types: { anyOf: ['presentation', 'app'] } } },
              disallow: { to: { module: { origin: 'external', source: INFRASTRUCTURE_SDKS } } },
            },
          ],
        },
      ],
    },
  },
  // Last: turns off the formatting rules that conflict with Prettier.
  prettierConfig,
]);
