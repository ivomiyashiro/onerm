/// <reference types="node" />
/**
 * @jest-environment node
 */
// The «load» stage of the catalog seed against local Supabase (ADR-0004 §3, RF-CAT-04 server side).
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type { Exercise } from '@/domain/models/exercise';
import type { RoutineTemplate } from '@/domain/models/routine-template';
import { loadCatalog } from '../catalog-seed/load';
import type { SeededExercise } from '../catalog-seed/pipeline';

const URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:55321';

/** The local stack's keys come from the CLI: nothing key-shaped is written in the repo. */
function localKey(name: 'PUBLISHABLE_KEY' | 'SECRET_KEY'): string {
  const fromEnv =
    name === 'SECRET_KEY' ? process.env.SUPABASE_SECRET_KEY : process.env.SUPABASE_PUBLISHABLE_KEY;
  if (fromEnv) return fromEnv;
  const status = execFileSync('./node_modules/.bin/supabase', ['status', '-o', 'env'], {
    encoding: 'utf8',
  });
  const match = status.match(new RegExp(`^${name}="?([^"\\n]+)"?$`, 'm'));
  if (!match) throw new Error(`${name} not found in \`supabase status\``);
  return match[1];
}
const PUBLISHABLE_KEY = localKey('PUBLISHABLE_KEY');
const SECRET_KEY = localKey('SECRET_KEY');

const NOW = new Date('2026-10-14T12:00:00Z');

function seeded(id: string, name: string): SeededExercise {
  const exercise: Exercise = {
    id,
    slug: `seed-test-${id.slice(0, 8)}`,
    name,
    aliases: ['Alias'],
    loadType: 'external',
    primaryMuscles: ['quads'],
    secondaryMuscles: ['glutes'],
    primaryEquipment: 'machine',
    equipment: ['machine'],
    mechanic: 'compound',
    isUnilateral: false,
    description: null,
    attributions: [{ source: 'fake', license: 'CC0', attribution: 'someone' }],
    deprecatedAt: null,
  };
  return { exercise, sourceRefs: [{ source: `fake-${id}`, externalId: '1' }] };
}

function template(id: string, exerciseId: string): RoutineTemplate {
  return {
    id,
    name: 'Plantilla',
    level: 'novice',
    daysPerWeek: 2,
    estimatedMinutes: 40,
    rationale: 'porque sí',
    days: [
      {
        id: `${id}-A`,
        name: 'Día A',
        position: 1,
        exercises: [{ id: `${id}-A1`, exerciseId, position: 1, role: 'main', sets: 3 }],
      },
    ],
  };
}

describe('catalog seed: load into Supabase', () => {
  const admin: SupabaseClient = createClient(URL, SECRET_KEY, { auth: { persistSession: false } });
  const idA = randomUUID();
  const idB = randomUUID();
  const templateId = `SEED-TEST-${idA.slice(0, 8)}`;
  const templates = [template(templateId, idA)];
  // Only these may be deprecated: the stack is shared with the seeded catalog.
  const own = new Set([idA, idB]);

  async function remote(id: string) {
    const { data } = await admin.from('exercises').select().eq('id', id).single();
    return data;
  }

  afterAll(async () => {
    await admin.from('template_exercises').delete().like('id', `${templateId}%`);
    await admin.from('template_days').delete().like('id', `${templateId}%`);
    await admin.from('routine_templates').delete().eq('id', templateId);
    await admin.from('exercise_source_refs').delete().in('exercise_id', [idA, idB]);
    await admin.from('exercises').delete().in('id', [idA, idB]);
  });

  it('writes the catalog, and running it again changes nothing', async () => {
    const both = [seeded(idA, 'Uno'), seeded(idB, 'Dos')];
    const first = await loadCatalog(admin, both, templates, NOW, own);
    expect(first.written).toMatchObject({
      routine_templates: 1,
      template_days: 1,
      template_exercises: 1,
    });
    expect(first.written.exercises).toBeGreaterThanOrEqual(2);
    const before = await remote(idA);

    const second = await loadCatalog(admin, both, templates, NOW, own);
    expect(second.written).toEqual({
      exercises: 0,
      exercise_source_refs: 0,
      routine_templates: 0,
      template_days: 0,
      template_exercises: 0,
    });
    // The cursor of an exercise that didn't change doesn't move: no app pulls it again.
    expect((await remote(idA)).server_updated_at).toBe(before.server_updated_at);
  });

  it('rewrites only the exercise that changed, and moves its cursor (RF-CAT-04)', async () => {
    const beforeA = await remote(idA);
    const beforeB = await remote(idB);

    const report = await loadCatalog(
      admin,
      [seeded(idA, 'Uno'), seeded(idB, 'Dos (nuevo nombre)')],
      templates,
      NOW,
      own,
    );

    expect(report.written.exercises).toBe(1);
    expect((await remote(idA)).server_updated_at).toBe(beforeA.server_updated_at);
    const afterB = await remote(idB);
    expect(afterB.name).toBe('Dos (nuevo nombre)');
    expect(new Date(afterB.server_updated_at).getTime()).toBeGreaterThan(
      new Date(beforeB.server_updated_at).getTime(),
    );
  });

  it('deprecates an exercise that left the catalog instead of deleting it (RN-CAT-01)', async () => {
    await loadCatalog(admin, [seeded(idA, 'Uno')], templates, NOW, own);
    const gone = await remote(idB);
    expect(gone).not.toBeNull();
    expect(new Date(gone.deprecated_at).toISOString()).toBe(NOW.toISOString());
  });

  it('the app reads the catalog but cannot write it (RNF-08)', async () => {
    const app = createClient(URL, PUBLISHABLE_KEY, { auth: { persistSession: false } });
    const read = await app.from('exercises').select().eq('id', idA).single();
    expect(read.data).toMatchObject({ id: idA, name: 'Uno' });

    const write = await app.from('exercises').update({ name: 'hacked' }).eq('id', idA).select();
    expect(write.error ?? write.data).toBeTruthy();
    expect((await remote(idA)).name).toBe('Uno');
  });
});
