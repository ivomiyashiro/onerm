// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const tseslint = require('typescript-eslint');
const prettierConfig = require('eslint-config-prettier');
const boundaries = require('eslint-plugin-boundaries');

// SDKs de infraestructura: solo los puede importar data (y di, que la compone).
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
  // Reglas de capas de Clean Architecture (12 §1, ADR-0011, RNF-11). No se desactivan.
  {
    files: ['src/**/*.{ts,tsx}', 'app/**/*.{ts,tsx}'],
    plugins: { boundaries },
    settings: {
      'import/resolver': {
        typescript: { project: './tsconfig.json' },
      },
      'boundaries/elements': [
        { type: 'domain', pattern: 'src/domain' },
        { type: 'data', pattern: 'src/data' },
        { type: 'presentation', pattern: 'src/presentation' },
        { type: 'di', pattern: 'src/di' },
        { type: 'app', pattern: 'app' },
      ],
    },
    rules: {
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          // Sin esto la regla ignora los paquetes externos y domain podría importar React.
          checkAllOrigins: true,
          policies: [
            // domain es TypeScript puro: ni otras capas ni paquetes externos.
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
            // Composition root: el único que conoce a la vez data y presentation.
            {
              from: { element: { type: 'di' } },
              allow: [
                { to: { element: { types: { anyOf: ['domain', 'data', 'presentation', 'di'] } } } },
                { to: { module: { origin: 'external' } } },
              ],
            },
            // Expo Router: solo composición de pantallas.
            {
              from: { element: { type: 'app' } },
              allow: [
                { to: { element: { types: { anyOf: ['domain', 'presentation', 'di', 'app'] } } } },
                { to: { module: { origin: 'external' } } },
              ],
            },
            // Va al final porque gana la última política que coincide.
            {
              from: { element: { types: { anyOf: ['presentation', 'app'] } } },
              disallow: { to: { module: { origin: 'external', source: INFRASTRUCTURE_SDKS } } },
            },
          ],
        },
      ],
    },
  },
  {
    // Destinos de import del test de las reglas de capas; no se usan en la app.
    ignores: ['src/**/__fixtures__/**'],
  },
  // Último: apaga las reglas de formato que pisan a Prettier.
  prettierConfig,
]);
