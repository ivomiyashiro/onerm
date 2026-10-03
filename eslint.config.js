// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const tseslint = require('typescript-eslint');
const prettierConfig = require('eslint-config-prettier');
const boundaries = require('eslint-plugin-boundaries');

// SDKs de infraestructura: solo los puede importar data (y di, que la compone).
// Lista cerrada: al sumar cualquier SDK de persistencia o red (otro SQLite, un cliente HTTP),
// se agrega acá y en tools/lint/boundaries.test.ts.
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
    files: ['src/**/*.{js,jsx,ts,tsx}', 'app/**/*.{js,jsx,ts,tsx}'],
    plugins: { boundaries },
    settings: {
      'import/resolver': {
        typescript: { project: './tsconfig.json' },
      },
      'boundaries/elements': [
        // partialMatch: false: el patrón se compara con la ruta completa desde la raíz. Sin esto,
        // una carpeta src/domain/app/ se clasificaba como app y heredaba sus permisos.
        { type: 'domain', partialMatch: false, pattern: 'src/domain/**' },
        { type: 'data', partialMatch: false, pattern: 'src/data/**' },
        { type: 'presentation', partialMatch: false, pattern: 'src/presentation/**' },
        { type: 'di', partialMatch: false, pattern: 'src/di/**' },
        { type: 'app', partialMatch: false, pattern: 'app/**' },
      ],
    },
    rules: {
      // Todo archivo de src/ y app/ pertenece a una capa: nada de src/shared/ o src/utils/ como
      // puente para saltar las reglas. Y ninguna capa importa archivos locales sin capa.
      'boundaries/no-unknown-files': 'error',
      'boundaries/no-unknown-dependencies': 'error',
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
  // Último: apaga las reglas de formato que pisan a Prettier.
  prettierConfig,
]);
