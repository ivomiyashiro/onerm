import type { SupabaseClient } from '@supabase/supabase-js';

import type { RoutineTemplate } from '@/domain/models/routine-template';

import type { SeededExercise } from './pipeline';

type Row = Record<string, unknown>;

export interface LoadReport {
  /** Rows written, by table. */
  readonly written: Readonly<Record<string, number>>;
  /** Rows that already matched the server and were left alone. */
  readonly unchanged: Readonly<Record<string, number>>;
  /** Exercises that left the catalog and were marked as deprecated (never deleted, RN-CAT-01). */
  readonly deprecated: number;
}

const stable = (value: unknown): string =>
  JSON.stringify(value, (_key, v) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)))
      : v,
  );

/** A timestamptz comes back as `2026-10-14T00:00:00+00:00`; compare instants, not spellings. */
const instant = (value: unknown) => (typeof value === 'string' ? new Date(value).getTime() : value);

function sameRow(wanted: Row, existing: Row): boolean {
  return Object.keys(wanted).every((column) =>
    column === 'deprecated_at'
      ? instant(wanted[column]) === instant(existing[column])
      : stable(wanted[column]) === stable(existing[column]),
  );
}

/**
 * Upserts only the rows that differ from the server. The server stamps `server_updated_at` on every
 * write, so rewriting an unchanged row would make every app pull it again (RF-CAT-04).
 */
async function syncTable(
  client: SupabaseClient,
  table: string,
  keys: readonly string[],
  rows: readonly Row[],
): Promise<{ written: number; unchanged: number }> {
  if (rows.length === 0) return { written: 0, unchanged: 0 };
  const columns = Object.keys(rows[0]).join(',');
  const { data, error } = await client.from(table).select(columns);
  if (error) throw new Error(`${table}: ${error.message}`);

  const keyOf = (row: Row) => keys.map((key) => String(row[key])).join('\u0000');
  const existing = new Map((data as unknown as Row[]).map((row) => [keyOf(row), row]));
  const changed = rows.filter((row) => {
    const current = existing.get(keyOf(row));
    return !current || !sameRow(row, current);
  });

  if (changed.length > 0) {
    const { error: upsertError } = await client
      .from(table)
      .upsert(changed as Row[], { onConflict: keys.join(',') });
    if (upsertError) throw new Error(`${table}: ${upsertError.message}`);
  }
  return { written: changed.length, unchanged: rows.length - changed.length };
}

/**
 * ADR-0004 §3 «load»: idempotent upsert of the catalog into Supabase. It needs the `service_role`
 * key, so it only runs from the maintainer's machine (RNF-08), never from the app.
 */
export async function loadCatalog(
  client: SupabaseClient,
  seeded: readonly SeededExercise[],
  templates: readonly RoutineTemplate[],
  now: Date,
  /** Limits which exercises may be deprecated (a test shares the server with other data). */
  deprecateAmong?: ReadonlySet<string>,
): Promise<LoadReport> {
  const written: Record<string, number> = {};
  const unchanged: Record<string, number> = {};
  const run = async (table: string, keys: string[], rows: Row[]) => {
    const result = await syncTable(client, table, keys, rows);
    written[table] = result.written;
    unchanged[table] = result.unchanged;
  };

  await run(
    'exercises',
    ['id'],
    seeded.map(({ exercise: e }) => ({
      id: e.id,
      slug: e.slug,
      name: e.name,
      aliases: e.aliases,
      load_type: e.loadType,
      primary_muscles: e.primaryMuscles,
      secondary_muscles: e.secondaryMuscles,
      primary_equipment: e.primaryEquipment,
      equipment: e.equipment,
      mechanic: e.mechanic,
      is_unilateral: e.isUnilateral,
      description: e.description,
      attributions: e.attributions,
      deprecated_at: e.deprecatedAt?.toISOString() ?? null,
    })),
  );
  await run(
    'exercise_source_refs',
    ['source', 'external_id'],
    seeded.flatMap(({ exercise, sourceRefs }) =>
      sourceRefs.map((ref) => ({
        exercise_id: exercise.id,
        source: ref.source,
        external_id: ref.externalId,
      })),
    ),
  );
  await run(
    'routine_templates',
    ['id'],
    templates.map((t) => ({
      id: t.id,
      name: t.name,
      level: t.level,
      days_per_week: t.daysPerWeek,
      estimated_minutes: t.estimatedMinutes,
      rationale: t.rationale,
    })),
  );
  await run(
    'template_days',
    ['id'],
    templates.flatMap((t) =>
      t.days.map((d) => ({ id: d.id, template_id: t.id, name: d.name, position: d.position })),
    ),
  );
  await run(
    'template_exercises',
    ['id'],
    templates.flatMap((t) =>
      t.days.flatMap((d) =>
        d.exercises.map((e) => ({
          id: e.id,
          template_day_id: d.id,
          exercise_id: e.exerciseId,
          position: e.position,
          role: e.role,
          sets: e.sets,
        })),
      ),
    ),
  );

  // An exercise that left the curation is deprecated, never deleted (RN-CAT-01, ADR-0004 §5).
  const { data: live, error } = await client
    .from('exercises')
    .select('id')
    .is('deprecated_at', null);
  if (error) throw new Error(`exercises: ${error.message}`);
  const kept = new Set(seeded.map(({ exercise }) => exercise.id));
  const gone = (live as { id: string }[])
    .map((row) => row.id)
    .filter((id) => !kept.has(id) && (deprecateAmong?.has(id) ?? true));
  if (gone.length > 0) {
    const { error: deprecateError } = await client
      .from('exercises')
      .update({ deprecated_at: now.toISOString() })
      .in('id', gone);
    if (deprecateError) throw new Error(`exercises: ${deprecateError.message}`);
  }

  return { written, unchanged, deprecated: gone.length };
}
