/// <reference types="node" />
/**
 * @jest-environment node
 */
import path from 'node:path';

import { ESLint } from 'eslint';

// RNF-11: las reglas de capas de 12 §1 (ADR-0011) las verifica el lint.
const root = path.resolve(__dirname, '../..');
// La config se pasa con require: ESLint la cargaría con import() dinámico, que Jest no soporta.
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

describe('RNF-11 · reglas de capas', () => {
  describe('domain no importa nada fuera de domain', () => {
    it.each([
      ['data', DATA],
      ['presentation', PRESENTATION],
      ['di', DI],
      ['react', "import { useState } from 'react';"],
      ['expo', "import Constants from 'expo-constants';"],
      ['supabase', "import { createClient } from '@supabase/supabase-js';"],
      ['drizzle', "import { sqliteTable } from 'drizzle-orm/sqlite-core';"],
    ])('domain → %s falla', async (_, code) => {
      expect(await boundaryErrors('src/domain/probe.ts', code)).not.toHaveLength(0);
    });

    it('domain → domain pasa', async () => {
      expect(await boundaryErrors('src/domain/probe.ts', DOMAIN)).toEqual([]);
    });
  });

  describe('presentation no importa data ni los SDKs de Supabase o SQLite', () => {
    it.each([
      ['data', DATA],
      ['di', DI],
      ['supabase', "import { createClient } from '@supabase/supabase-js';"],
      ['expo-sqlite', "import * as SQLite from 'expo-sqlite';"],
      ['drizzle', "import { eq } from 'drizzle-orm';"],
    ])('presentation → %s falla', async (_, code) => {
      expect(await boundaryErrors('src/presentation/probe.tsx', code)).not.toHaveLength(0);
    });

    it('presentation → domain y react pasa', async () => {
      const code = `${DOMAIN}\nimport { View } from 'react-native';`;
      expect(await boundaryErrors('src/presentation/probe.tsx', code)).toEqual([]);
    });
  });

  describe('data no importa presentation', () => {
    it.each([
      ['presentation', PRESENTATION],
      ['di', DI],
    ])('data → %s falla', async (_, code) => {
      expect(await boundaryErrors('src/data/probe.ts', code)).not.toHaveLength(0);
    });

    it('data → domain y SDKs pasa', async () => {
      const code = `${DOMAIN}\nimport * as SQLite from 'expo-sqlite';`;
      expect(await boundaryErrors('src/data/probe.ts', code)).toEqual([]);
    });
  });

  describe('solo di conoce a la vez data y presentation', () => {
    it('di → data + presentation + domain pasa', async () => {
      const code = `${DATA}\n${PRESENTATION}\n${DOMAIN}`;
      expect(await boundaryErrors('src/di/probe.tsx', code)).toEqual([]);
    });

    it.each([
      ['data', DATA],
      ['supabase', "import { createClient } from '@supabase/supabase-js';"],
    ])('app → %s falla', async (_, code) => {
      expect(await boundaryErrors('app/probe.tsx', code)).not.toHaveLength(0);
    });

    it('app → presentation y di pasa', async () => {
      const code = `${PRESENTATION}\n${DI}`;
      expect(await boundaryErrors('app/probe.tsx', code)).toEqual([]);
    });
  });

  // Huecos encontrados en la revisión de fase F0.
  describe('sin atajos para saltar las reglas', () => {
    it.each([
      ['src/domain/app/probe.ts', "import { useState } from 'react';"],
      ['src/domain/rules/app/probe.ts', "import Constants from 'expo-constants';"],
      ['src/data/app/probe.ts', PRESENTATION],
    ])('una carpeta app/ dentro de una capa no hereda los permisos de app (%s)', async (file, code) => {
      expect(await boundaryErrors(file, code)).not.toHaveLength(0);
    });

    it('un archivo de src/ fuera de las capas falla', async () => {
      expect(await boundaryErrors('src/shared/probe.ts', 'export const x = 1;')).not.toHaveLength(0);
    });

    it('una capa no importa archivos locales fuera de las capas', async () => {
      const code = "import config from '../../tools/lint/boundaries.test';";
      expect(await boundaryErrors('src/domain/probe.ts', code)).not.toHaveLength(0);
    });

    it.each([['src/domain/probe.js'], ['src/domain/probe.jsx']])(
      'los archivos JS también se revisan (%s)',
      async (file) => {
        expect(await boundaryErrors(file, "import { useState } from 'react';")).not.toHaveLength(0);
      },
    );

    it('los __fixtures__ de los tests también se revisan', async () => {
      const code = "import { useState } from 'react';";
      expect(await boundaryErrors('src/domain/__fixtures__/probe.ts', code)).not.toHaveLength(0);
    });
  });
});
