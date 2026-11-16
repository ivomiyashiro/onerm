/// <reference types="node" />
/**
 * @jest-environment node
 */
import path from 'node:path';

import { ESLint } from 'eslint';

import config from '../../eslint.config';

// Features and shared take the use cases from the hook of their group (#340), so each hook's
// signature shows what it depends on. `useUseCases` stays for the use-cases folder and tests.
const root = path.resolve(__dirname, '../..');
const eslint = new ESLint({ cwd: root, overrideConfigFile: true, overrideConfig: config });

async function restrictedImportErrors(filePath: string, code: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath: path.join(root, filePath) });
  return result.messages
    .filter((message) => message.ruleId === 'no-restricted-imports')
    .map((message) => message.message);
}

const ALL = "import { useUseCases } from '@/presentation/use-cases/use-cases-context';\n";
const GROUP = "import { useWorkoutUseCases } from '@/presentation/use-cases/use-cases-context';\n";
const NATIVE_TEXT = "import { Text } from 'react-native';\n";

describe('the use cases by group', () => {
  it.each([
    'src/presentation/features/workout/use-probe.ts',
    'src/presentation/features/sync/probe-watcher.tsx',
    'src/presentation/shared/set/use-probe.ts',
  ])('%s may not take every use case with useUseCases', async (filePath) => {
    expect(
      await restrictedImportErrors(filePath, `${ALL}export const used = useUseCases;\n`),
    ).toEqual([expect.stringContaining('useWorkoutUseCases')]);
  });

  it('a feature may take the hook of a group', async () => {
    expect(
      await restrictedImportErrors(
        'src/presentation/features/workout/use-probe.ts',
        `${GROUP}export const used = useWorkoutUseCases;\n`,
      ),
    ).toEqual([]);
  });

  it("a feature's .tsx still may not import React Native's Text", async () => {
    expect(
      await restrictedImportErrors(
        'src/presentation/features/workout/probe.tsx',
        `${NATIVE_TEXT}export const used = Text;\n`,
      ),
    ).toEqual([expect.stringContaining('Android 15+')]);
  });

  it.each([
    'src/presentation/use-cases/probe.ts',
    'src/presentation/features/workout/use-probe.test.tsx',
  ])('%s may use useUseCases', async (filePath) => {
    expect(
      await restrictedImportErrors(filePath, `${ALL}export const used = useUseCases;\n`),
    ).toEqual([]);
  });
});
