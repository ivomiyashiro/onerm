/// <reference types="node" />
/**
 * @jest-environment node
 */
import path from 'node:path';

import { ESLint } from 'eslint';

// Screens and components use the app's Text (src/presentation/components/text.tsx), which works
// around the Android 15+ text clipping. Importing React Native's Text directly is an error.
const root = path.resolve(__dirname, '../..');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const config = require('../../eslint.config.js');
const eslint = new ESLint({ cwd: root, overrideConfigFile: true, overrideConfig: config });

async function restrictedImportErrors(filePath: string, code: string): Promise<string[]> {
  const [result] = await eslint.lintText(`${code}\nexport const used = Text;\n`, {
    filePath: path.join(root, filePath),
  });
  return result.messages
    .filter((message) => message.ruleId === 'no-restricted-imports')
    .map((message) => message.message);
}

const NATIVE_TEXT = "import { Text } from 'react-native';";

describe("the app's Text", () => {
  it.each(['src/presentation/probe.tsx', 'app/probe.tsx'])(
    "%s may not import React Native's Text",
    async (filePath) => {
      expect(await restrictedImportErrors(filePath, NATIVE_TEXT)).not.toHaveLength(0);
    },
  );

  it('the wrapper itself and tests may', async () => {
    expect(
      await restrictedImportErrors(
        'src/presentation/components/text.tsx',
        "import { Text } from 'react-native';",
      ),
    ).toEqual([]);
    expect(await restrictedImportErrors('src/presentation/probe.test.tsx', NATIVE_TEXT)).toEqual(
      [],
    );
  });

  it('other React Native imports are fine', async () => {
    expect(
      await restrictedImportErrors(
        'src/presentation/probe.tsx',
        "import { View } from 'react-native';\nimport { Text } from '@/presentation/components/text';",
      ),
    ).toEqual([]);
  });
});
