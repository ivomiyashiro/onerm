/// <reference types="node" />
/**
 * @jest-environment node
 */
import path from 'node:path';

import { ESLint } from 'eslint';

// RNF-11: the layer rules of 12 §1 (ADR-0011) are enforced by the lint.
const root = path.resolve(__dirname, '../..');
// The config is passed via require: ESLint would load it with a dynamic import(), which Jest does not support.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const config = require('../../eslint.config.js');
const eslint = new ESLint({ cwd: root, overrideConfigFile: true, overrideConfig: config });

const DATA = "import { dataFixture } from '@/data/__fixtures__/boundaries-target';";
const DI = "import { diFixture } from '@/di/__fixtures__/boundaries-target';";
const DOMAIN = "import { areLoadsEqual } from '@/domain/rules/load-equality';";
const PRESENTATION = "import { HomeScreen } from '@/presentation/features/home/home-screen';";

async function boundaryErrors(filePath: string, code: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath: path.join(root, filePath) });
  return result.messages
    .filter((message) => message.ruleId?.startsWith('boundaries/'))
    .map((message) => message.message);
}

describe('RNF-11 · layer rules', () => {
  describe('domain imports nothing outside domain', () => {
    it.each([
      ['data', DATA],
      ['presentation', PRESENTATION],
      ['di', DI],
      ['react', "import { useState } from 'react';"],
      ['expo', "import Constants from 'expo-constants';"],
      ['supabase', "import { createClient } from '@supabase/supabase-js';"],
      ['drizzle', "import { sqliteTable } from 'drizzle-orm/sqlite-core';"],
    ])('domain → %s fails', async (_, code) => {
      expect(await boundaryErrors('src/domain/probe.ts', code)).not.toHaveLength(0);
    });

    it('domain → domain passes', async () => {
      expect(await boundaryErrors('src/domain/probe.ts', DOMAIN)).toEqual([]);
    });
  });

  describe('presentation imports neither data nor the Supabase or SQLite SDKs', () => {
    it.each([
      ['data', DATA],
      ['di', DI],
      ['supabase', "import { createClient } from '@supabase/supabase-js';"],
      ['expo-sqlite', "import * as SQLite from 'expo-sqlite';"],
      ['drizzle', "import { eq } from 'drizzle-orm';"],
    ])('presentation → %s fails', async (_, code) => {
      expect(await boundaryErrors('src/presentation/probe.tsx', code)).not.toHaveLength(0);
    });

    it('presentation → domain and react passes', async () => {
      const code = `${DOMAIN}\nimport { View } from 'react-native';`;
      expect(await boundaryErrors('src/presentation/probe.tsx', code)).toEqual([]);
    });
  });

  describe('data does not import presentation', () => {
    it.each([
      ['presentation', PRESENTATION],
      ['di', DI],
    ])('data → %s fails', async (_, code) => {
      expect(await boundaryErrors('src/data/probe.ts', code)).not.toHaveLength(0);
    });

    it('data → domain and SDKs passes', async () => {
      const code = `${DOMAIN}\nimport * as SQLite from 'expo-sqlite';`;
      expect(await boundaryErrors('src/data/probe.ts', code)).toEqual([]);
    });
  });

  describe('only di knows both data and presentation', () => {
    it('di → data + presentation + domain passes', async () => {
      const code = `${DATA}\n${PRESENTATION}\n${DOMAIN}`;
      expect(await boundaryErrors('src/di/probe.tsx', code)).toEqual([]);
    });

    it.each([
      ['data', DATA],
      ['supabase', "import { createClient } from '@supabase/supabase-js';"],
    ])('app → %s fails', async (_, code) => {
      expect(await boundaryErrors('app/probe.tsx', code)).not.toHaveLength(0);
    });

    it('app → presentation and di passes', async () => {
      const code = `${PRESENTATION}\n${DI}`;
      expect(await boundaryErrors('app/probe.tsx', code)).toEqual([]);
    });
  });

  // Gaps found in the F0 phase review.
  describe('no shortcuts to bypass the rules', () => {
    it.each([
      ['src/domain/app/probe.ts', "import { useState } from 'react';"],
      ['src/domain/rules/app/probe.ts', "import Constants from 'expo-constants';"],
      ['src/data/app/probe.ts', PRESENTATION],
    ])(
      'an app/ folder inside a layer does not inherit app permissions (%s)',
      async (file, code) => {
        expect(await boundaryErrors(file, code)).not.toHaveLength(0);
      },
    );

    it('a src/ file outside the layers fails', async () => {
      expect(await boundaryErrors('src/shared/probe.ts', 'export const x = 1;')).not.toHaveLength(
        0,
      );
    });

    it('a layer does not import local files outside the layers', async () => {
      const code = "import config from '../../tools/lint/boundaries.test';";
      expect(await boundaryErrors('src/domain/probe.ts', code)).not.toHaveLength(0);
    });

    it.each([['src/domain/probe.js'], ['src/domain/probe.jsx']])(
      'JS files are checked too (%s)',
      async (file) => {
        expect(await boundaryErrors(file, "import { useState } from 'react';")).not.toHaveLength(0);
      },
    );

    it('test __fixtures__ are checked too', async () => {
      const code = "import { useState } from 'react';";
      expect(await boundaryErrors('src/domain/__fixtures__/probe.ts', code)).not.toHaveLength(0);
    });
  });
});
