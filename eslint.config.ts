// https://docs.expo.dev/guides/using-eslint/
import prettierConfig from 'eslint-config-prettier';
import expoConfig from 'eslint-config-expo/flat';
import boundaries from 'eslint-plugin-boundaries';
import { defineConfig } from 'eslint/config';
import { configs as tseslint } from 'typescript-eslint';

// Infrastructure SDKs: only data may import them (and di, which composes it).
// Closed list: when adding any persistence or network SDK (another SQLite, an HTTP client),
// add it here and in tools/lint/boundaries.test.ts.
const INFRASTRUCTURE_SDKS = [
  '@supabase/**',
  'expo-sqlite',
  'expo-sqlite/**',
  'drizzle-orm',
  'drizzle-orm/**',
  // Behind the RestNotifier and DevicePermissions ports (RN-ENT-07).
  'expo-notifications',
  // Behind the SyncTriggers port (RN-SYNC-06 b).
  '@react-native-community/netinfo',
];

// The folders the layers live in. Only their files get a category: a file outside them stays
// unknown, so boundaries/no-unknown-files still reports it.
const LAYER_FOLDERS = '{src/domain,src/data,src/presentation,src/di,app}';
// Test code (#338): tests, fixtures and the fakes the tests share. Everything else is production.
const TEST_FILES = [
  `${LAYER_FOLDERS}/**/*.test.{ts,tsx}`,
  `${LAYER_FOLDERS}/**/*.fixture.{ts,tsx}`,
  'src/domain/testing/**',
  'src/presentation/use-cases/testing.ts',
];
// What only test code may import: any testing folder or file, the fixtures and the in-memory
// database of the integration tests (plus @testing-library, below).
const TEST_ONLY_FILES = [
  `${LAYER_FOLDERS}/**/testing.{ts,tsx}`,
  `${LAYER_FOLDERS}/**/testing/**`,
  `${LAYER_FOLDERS}/**/*.fixture.{ts,tsx}`,
  'src/data/db/open-test-database.ts',
];
// Where use cases are taken from (ADR-0011 §1, updated in #332): ViewModels and feature hooks
// (use-*), watchers and the use-cases folder itself. Visual components receive data and callbacks.
const USE_CASE_CONSUMERS = [
  'src/presentation/**/use-*.{ts,tsx}',
  'src/presentation/**/*-watcher.tsx',
  'src/presentation/use-cases/**',
];

// Props (and object keys inside props, such as `action={{ label }}` or `options={{ title }}`) that
// carry UI text. Literal values are not allowed in them (RNF-21).
const TEXT_PROPS =
  '/^(label|title|subtitle|body|message|note|help|error|placeholder|unit|text|loadingLabel|closeLabel|decrementLabel|incrementLabel|accessibilityLabel|accessibilityHint|aria-label)$/';
const LITERAL_TEXT_MESSAGE =
  'UI texts come from src/presentation/strings (RNF-21), never written in the component.';
// A string literal with visible text (numbers and whitespace-only strings are fine).
const STRING = "Literal[raw=/^['\\x22].*\\S/]";
// The ways an expression can put a literal text on screen: the literal itself, a template with
// text, or a literal inside a ternary, a && / ?? or a concatenation.
const TEXT_EXPRESSIONS = [
  STRING,
  'TemplateLiteral > TemplateElement[value.raw=/\\S/]',
  `ConditionalExpression > ${STRING}`,
  `LogicalExpression > ${STRING}`,
  `BinaryExpression[operator="+"] > ${STRING}`,
];
const TEXT_CONTAINERS = [
  ':matches(JSXElement, JSXFragment) > JSXExpressionContainer',
  `JSXAttribute[name.name=${TEXT_PROPS}] > JSXExpressionContainer`,
  `JSXAttribute > JSXExpressionContainer Property[key.name=${TEXT_PROPS}]`,
];
const LITERAL_TEXT_SELECTORS = [
  'JSXText[value=/\\S/]',
  `JSXAttribute[name.name=${TEXT_PROPS}] > Literal`,
  ...TEXT_CONTAINERS.flatMap((container) =>
    TEXT_EXPRESSIONS.map((expression) => `${container} > ${expression}`),
  ),
];

export default defineConfig([
  {
    ignores: ['dist/', 'coverage/', 'android/', 'ios/', '.expo/', 'expo-env.d.ts'],
  },
  expoConfig,
  {
    files: ['**/*.ts', '**/*.tsx'],
    extends: [tseslint.recommended],
    rules: {
      // tsc already fails on a missing member of `import * as ns`, and this rule took a third of
      // the lint time (#233). typescript-eslint recommends turning it off in TypeScript projects.
      'import/namespace': 'off',
    },
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
        // Before presentation: the first matching element wins. Each feature is its own element, so
        // one feature can be told apart from another (#338).
        {
          type: 'feature',
          partialMatch: false,
          pattern: 'src/presentation/features/*',
          capture: ['feature'],
        },
        // The rest of presentation: components, shared, strings, theme, state, navigation, use-cases,
        // widgets and assets.
        { type: 'presentation', partialMatch: false, pattern: 'src/presentation/**' },
        { type: 'di', partialMatch: false, pattern: 'src/di/**' },
        { type: 'app', partialMatch: false, pattern: 'app/**' },
        // The SQLite migrations generated by drizzle-kit (ADR-0010): only data bundles them.
        { type: 'migrations', partialMatch: false, pattern: 'drizzle/**' },
        // Local native modules (Expo Modules API): only data wraps them behind a domain port.
        { type: 'native-modules', partialMatch: false, pattern: 'modules/**' },
      ],
      // Every file is either test code or production, so a policy can apply to production only.
      'boundaries/files-single-match': true,
      'boundaries/files': [
        { category: 'test', pattern: TEST_FILES },
        { category: 'production', pattern: `${LAYER_FOLDERS}/**` },
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
          // Without this the rule ignores imports inside one element, such as presentation's
          // strings → components or domain → domain/testing (#338). Each layer allows itself below.
          checkInternals: true,
          policies: [
            // domain is pure TypeScript: no other layers and no external packages.
            {
              from: { element: { type: 'domain' } },
              allow: { to: { element: { type: 'domain' } } },
            },
            {
              from: { element: { type: 'data' } },
              allow: [
                {
                  to: {
                    element: {
                      types: { anyOf: ['domain', 'data', 'migrations', 'native-modules'] },
                    },
                  },
                },
                { to: { module: { origin: 'external' } } },
              ],
            },
            // What features share: never a feature (#338).
            {
              from: { element: { type: 'presentation' } },
              allow: [
                { to: { element: { types: { anyOf: ['domain', 'presentation'] } } } },
                { to: { module: { origin: 'external' } } },
              ],
            },
            // A feature uses domain, what features share and its own files, never another feature.
            {
              from: { element: { type: 'feature' } },
              allow: [
                { to: { element: { types: { anyOf: ['domain', 'presentation'] } } } },
                {
                  to: {
                    element: {
                      type: 'feature',
                      captured: { feature: '{{ from.element.captured.feature }}' },
                    },
                  },
                },
                { to: { module: { origin: 'external' } } },
              ],
            },
            // The only two features that use another one, each to one file (#337).
            {
              // The routine editor embeds the whole exercise search screen.
              from: { file: { path: 'src/presentation/features/routine-editor/**' } },
              allow: {
                to: {
                  file: { path: 'src/presentation/features/exercises/exercise-search-screen.tsx' },
                },
              },
            },
            {
              // The how-to sheet brings video-link and a ViewModel with use cases.
              from: { file: { path: 'src/presentation/features/workout/**' } },
              allow: {
                to: { file: { path: 'src/presentation/features/exercises/how-to-sheet.tsx' } },
              },
            },
            // Composition root: the only layer that knows both data and presentation.
            {
              from: { element: { type: 'di' } },
              allow: [
                {
                  to: {
                    element: {
                      types: { anyOf: ['domain', 'data', 'feature', 'presentation', 'di'] },
                    },
                  },
                },
                { to: { module: { origin: 'external' } } },
              ],
            },
            // Expo Router: screen composition only.
            {
              from: { element: { type: 'app' } },
              allow: [
                {
                  to: {
                    element: {
                      types: { anyOf: ['domain', 'feature', 'presentation', 'di', 'app'] },
                    },
                  },
                },
                { to: { module: { origin: 'external' } } },
              ],
            },
            // The texts and the tokens are the base of the components, not the other way round.
            {
              from: {
                file: { path: ['src/presentation/strings/**', 'src/presentation/theme/**'] },
              },
              disallow: {
                to: {
                  file: { path: ['src/presentation/components/**', 'src/presentation/shared/**'] },
                },
              },
            },
            // Components don't know about navigation.
            {
              from: { file: { path: 'src/presentation/components/**' } },
              disallow: { to: { module: { source: 'expo-router' } } },
            },
            {
              // The exception: the row closes itself when its screen loses focus (useIsFocused),
              // and doing it another way would change the gesture.
              from: { file: { path: 'src/presentation/components/list/swipe-row.tsx' } },
              allow: { to: { module: { source: 'expo-router' } } },
            },
            // Visual components receive data and callbacks; they don't take use cases.
            {
              from: {
                element: { types: { anyOf: ['feature', 'presentation', 'app'] } },
                file: { categories: 'production' },
              },
              disallow: {
                to: { file: { path: 'src/presentation/use-cases/use-cases-context.tsx' } },
              },
            },
            {
              from: { file: { path: USE_CASE_CONSUMERS } },
              allow: {
                to: { file: { path: 'src/presentation/use-cases/use-cases-context.tsx' } },
              },
            },
            // Production code never imports test code. Test code still follows the layers above.
            {
              from: { file: { categories: 'production' } },
              disallow: [
                { to: { module: { source: '@testing-library/**' } } },
                { to: { file: { path: TEST_ONLY_FILES } } },
              ],
            },
            // Goes last because the last matching policy wins.
            {
              from: { element: { types: { anyOf: ['feature', 'presentation', 'app'] } } },
              disallow: { to: { module: { origin: 'external', source: INFRASTRUCTURE_SDKS } } },
            },
          ],
        },
      ],
    },
  },
  // RNF-21: no literal UI text in screens or components. Tests and the strings themselves may.
  {
    files: ['src/presentation/**/*.tsx', 'app/**/*.tsx'],
    ignores: ['**/*.test.tsx', 'src/presentation/strings/**'],
    rules: {
      'no-restricted-syntax': [
        'error',
        ...LITERAL_TEXT_SELECTORS.map((selector) => ({ selector, message: LITERAL_TEXT_MESSAGE })),
      ],
    },
  },
  // Screens and components use the app's Text, which works around the Android 15+ text clipping
  // (see src/presentation/components/text.tsx).
  {
    files: ['src/presentation/**/*.tsx', 'app/**/*.tsx'],
    ignores: ['**/*.test.tsx', 'src/presentation/components/text.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'react-native',
              importNames: ['Text'],
              message:
                "Use Text from '@/presentation/components/text' (Android 15+ text clipping).",
            },
          ],
        },
      ],
    },
  },
  // Last: turns off the formatting rules that conflict with Prettier.
  prettierConfig,
]);
