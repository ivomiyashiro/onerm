/// <reference types="node" />
/**
 * @jest-environment node
 */
import path from 'node:path';

import { ESLint } from 'eslint';

import config from '../../eslint.config';

// RNF-11 inside presentation and around the test code (ADR-0013, #338): features stay independent,
// what they share lives in an explicit place, and production code never reaches test helpers.
const root = path.resolve(__dirname, '../..');
// The config is imported and passed in: ESLint would load it with a dynamic import(), which Jest does not support.
const eslint = new ESLint({ cwd: root, overrideConfigFile: true, overrideConfig: config });

const feature = (name: string, file: string) =>
  `import { x } from '@/presentation/features/${name}/${file}';`;
const USE_CASES = "import { useUseCases } from '@/presentation/use-cases/use-cases-context';";

// Only boundaries/dependencies: an import that doesn't resolve fails another rule, so it can't make
// a case below fail for the wrong reason.
async function boundaryErrors(filePath: string, code: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath: path.join(root, filePath) });
  return result.messages
    .filter((message) => message.ruleId === 'boundaries/dependencies')
    .map((message) => message.message);
}

describe('RNF-11 · rules inside presentation', () => {
  describe('a feature does not import another one', () => {
    it('home → workout fails', async () => {
      const code = feature('workout', 'workout-screen');
      expect(await boundaryErrors('src/presentation/features/home/probe.tsx', code)).not.toEqual(
        [],
      );
    });

    it('a feature → itself, shared and components passes', async () => {
      const code = [
        feature('home', 'home-screen'),
        "import { trendOf } from '@/presentation/shared/trend';",
        "import { Button } from '@/presentation/components/button/button';",
      ].join('\n');
      expect(await boundaryErrors('src/presentation/features/home/probe.tsx', code)).toEqual([]);
    });

    // The two exceptions, each one exact (#337).
    it.each([
      // The routine editor embeds the whole exercise search screen.
      ['routine-editor', 'exercise-search-screen'],
      // The how-to sheet brings video-link and a ViewModel with use cases.
      ['workout', 'how-to-sheet'],
    ])('%s → exercises/%s passes', async (from, file) => {
      const code = feature('exercises', file);
      expect(await boundaryErrors(`src/presentation/features/${from}/probe.tsx`, code)).toEqual([]);
    });

    it.each([
      ['routine-editor', 'how-to-sheet'],
      ['workout', 'exercise-search-screen'],
      ['home', 'exercise-search-screen'],
    ])('%s → exercises/%s fails: the exceptions do not widen', async (from, file) => {
      const code = feature('exercises', file);
      expect(await boundaryErrors(`src/presentation/features/${from}/probe.tsx`, code)).not.toEqual(
        [],
      );
    });
  });

  describe('what features use does not import features', () => {
    it.each([
      'components',
      'shared',
      'strings',
      'theme',
      'state',
      'navigation',
      'use-cases',
      'widgets',
    ])('%s → a feature fails', async (folder) => {
      const code = feature('home', 'home-screen');
      expect(await boundaryErrors(`src/presentation/${folder}/probe.tsx`, code)).not.toEqual([]);
    });
  });

  describe('strings and theme import neither components nor shared', () => {
    it.each([
      ['strings', 'components/button/button'],
      ['strings', 'shared/trend'],
      ['theme', 'components/button/button'],
      ['theme', 'shared/trend'],
    ])('%s → %s fails', async (from, to) => {
      const code = `import { x } from '@/presentation/${to}';`;
      expect(await boundaryErrors(`src/presentation/${from}/probe.ts`, code)).not.toEqual([]);
    });

    it('strings → theme passes', async () => {
      const code = "import { colors } from '@/presentation/theme';";
      expect(await boundaryErrors('src/presentation/strings/probe.ts', code)).toEqual([]);
    });
  });

  describe('components do not import expo-router', () => {
    const ROUTER = "import { useIsFocused } from 'expo-router';";

    it('a component → expo-router fails', async () => {
      expect(
        await boundaryErrors('src/presentation/components/list/probe.tsx', ROUTER),
      ).not.toEqual([]);
    });

    // The exception: swipe-row closes itself when its screen loses focus, and changing how would
    // change the gesture.
    it('components/list/swipe-row.tsx → expo-router passes', async () => {
      expect(
        await boundaryErrors('src/presentation/components/list/swipe-row.tsx', ROUTER),
      ).toEqual([]);
    });

    it('a feature → expo-router passes', async () => {
      expect(await boundaryErrors('src/presentation/features/home/probe.tsx', ROUTER)).toEqual([]);
    });
  });
});

describe('RNF-11 · production code does not import test code', () => {
  const TEST_CODE = [
    ['@testing-library', "import { render } from '@testing-library/react-native';"],
    ['domain/testing', "import { aBilateralSet } from '@/domain/testing/builders';"],
    ['use-cases/testing', "import { fakeUseCases } from '@/presentation/use-cases/testing';"],
    [
      'a fixture',
      "import { Fixture } from '@/presentation/features/routine-editor/routine-editor-reorder.fixture';",
    ],
  ];
  const TEST_DATABASE = "import { openTestDatabase } from '@/data/db/open-test-database';";

  it.each(TEST_CODE)('a screen → %s fails', async (_, code) => {
    expect(
      await boundaryErrors('src/presentation/features/routine-editor/probe.tsx', code),
    ).not.toEqual([]);
  });

  it.each([
    ['app', 'app/probe.tsx', "import { render } from '@testing-library/react-native';"],
    ['data', 'src/data/probe.ts', TEST_DATABASE],
    ['domain', 'src/domain/probe.ts', "import { aBilateralSet } from '@/domain/testing/builders';"],
  ])('%s production → test code fails', async (_, file, code) => {
    expect(await boundaryErrors(file, code)).not.toEqual([]);
  });

  it.each(TEST_CODE)('a test → %s passes', async (_, code) => {
    expect(
      await boundaryErrors('src/presentation/features/routine-editor/probe.test.tsx', code),
    ).toEqual([]);
  });

  it('a fixture → @testing-library passes', async () => {
    const code = "import { render } from '@testing-library/react-native';";
    expect(
      await boundaryErrors('src/presentation/features/routine-editor/probe.fixture.tsx', code),
    ).toEqual([]);
  });

  it('an integration test → the test database passes', async () => {
    expect(await boundaryErrors('src/data/probe.int.test.ts', TEST_DATABASE)).toEqual([]);
  });

  it.each([
    ['src/domain/testing/probe.ts', "import { aBilateralSet } from '@/domain/testing/builders';"],
    [
      'src/presentation/use-cases/testing.ts',
      "import { aBilateralSet } from '@/domain/testing/builders';",
    ],
  ])('the test helpers themselves pass (%s)', async (file, code) => {
    expect(await boundaryErrors(file, code)).toEqual([]);
  });

  it('test code still follows the layers: a domain test → presentation fails', async () => {
    const code = "import { fakeUseCases } from '@/presentation/use-cases/testing';";
    expect(await boundaryErrors('src/domain/probe.test.ts', code)).not.toEqual([]);
  });
});

describe('RNF-11 · visual components do not take use cases (ADR-0011 §1)', () => {
  it.each([
    ['a screen', 'src/presentation/features/home/probe-screen.tsx'],
    ['a component', 'src/presentation/components/probe.tsx'],
    ['a shared piece', 'src/presentation/shared/probe.tsx'],
    ['a route', 'app/probe.tsx'],
  ])('%s → use-cases-context fails', async (_, file) => {
    expect(await boundaryErrors(file, USE_CASES)).not.toEqual([]);
  });

  it.each([
    ['a ViewModel', 'src/presentation/features/home/use-probe-view-model.ts'],
    ['a feature hook', 'src/presentation/features/auth/use-probe.ts'],
    ['a watcher', 'src/presentation/features/sync/probe-watcher.tsx'],
    ['the use-cases folder', 'src/presentation/use-cases/probe.tsx'],
    ['the composition root', 'src/di/probe.tsx'],
    ['a fixture', 'src/presentation/features/home/probe.fixture.tsx'],
    ['a test', 'src/presentation/features/home/probe-screen.test.tsx'],
  ])('%s → use-cases-context passes', async (_, file) => {
    expect(await boundaryErrors(file, USE_CASES)).toEqual([]);
  });
});

describe('RNF-11 · the infrastructure SDKs stay out of features', () => {
  it.each([
    ['a feature', 'src/presentation/features/home/probe.tsx'],
    ['a component', 'src/presentation/components/probe.tsx'],
  ])('%s → @supabase fails', async (_, file) => {
    const code = "import { createClient } from '@supabase/supabase-js';";
    expect(await boundaryErrors(file, code)).not.toEqual([]);
  });
});
