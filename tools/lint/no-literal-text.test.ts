/// <reference types="node" />
/**
 * @jest-environment node
 */
import path from 'node:path';

import { ESLint } from 'eslint';

// RNF-21: UI texts live in src/presentation/strings, never written in a component.
const root = path.resolve(__dirname, '../..');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const config = require('../../eslint.config.js');
const eslint = new ESLint({ cwd: root, overrideConfigFile: true, overrideConfig: config });

const HEADER =
  "import { Text } from 'react-native';\nimport { Button } from '@/presentation/components/button/button';\n";

async function literalTextErrors(filePath: string, body: string): Promise<string[]> {
  const [result] = await eslint.lintText(`${HEADER}${body}\n`, {
    filePath: path.join(root, filePath),
  });
  return result.messages
    .filter((message) => message.ruleId === 'no-restricted-syntax')
    .map((message) => message.message);
}

describe('RNF-21 · no literal UI text', () => {
  it.each([
    ['text child', 'export const A = () => <Text>Hola</Text>;'],
    ['string expression child', "export const A = () => <Text>{'Hola'}</Text>;"],
    [
      'label prop',
      'export const A = () => <Button variant="primary" label="Empezar" onPress={() => {}} />;',
    ],
    ['accessibilityLabel prop', "export const A = () => <Text accessibilityLabel={'Cerrar'} />;"],
  ])('a %s fails in presentation', async (_, body) => {
    expect(await literalTextErrors('src/presentation/probe.tsx', body)).not.toHaveLength(0);
  });

  it('a literal text fails in app/ too', async () => {
    expect(
      await literalTextErrors('app/probe.tsx', 'export default () => <Text>Hola</Text>;'),
    ).not.toHaveLength(0);
  });

  it.each([
    ['text from strings', 'const t = { hi: "Hola" };\nexport const A = () => <Text>{t.hi}</Text>;'],
    [
      'whitespace and non-text props',
      'export const A = () => (\n  <Text testID="hi" numberOfLines={1}> </Text>\n);',
    ],
  ])('%s passes', async (_, body) => {
    expect(await literalTextErrors('src/presentation/probe.tsx', body)).toEqual([]);
  });

  it.each(['src/presentation/probe.test.tsx', 'src/presentation/strings/probe.tsx'])(
    '%s may write texts',
    async (filePath) => {
      expect(
        await literalTextErrors(filePath, 'export const A = () => <Text>Hola</Text>;'),
      ).toEqual([]);
    },
  );
});
