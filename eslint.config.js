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
