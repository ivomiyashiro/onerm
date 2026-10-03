// SPIKE #13 — minimal push/pull of 07 §4.1 for workouts → workout_sets. Not merged.
import type { SupabaseClient } from '@supabase/supabase-js';
import { and, eq, isNull, notInArray, sql } from 'drizzle-orm';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';

import { workoutSets, workouts } from '../db/schema';

export type AppDatabase = BaseSQLiteDatabase<'sync', unknown>;

type WorkoutRow = typeof workouts.$inferSelect;
type SetRow = typeof workoutSets.$inferSelect;
type RemoteRow = Record<string, unknown> & {
  id: string;
  updated_at: string;
  deleted_at: string | null;
  server_updated_at: string;
};

const PUSH_BATCH = 200;
const PULL_OVERLAP_MS = 5_000;
const MIN_UUID = '00000000-0000-0000-0000-000000000000';
/** Rejections that will never succeed on retry (RN-SYNC-11): RLS, CHECK, FK, NOT NULL. */
const FINAL_REJECTIONS = new Set(['42501', '23514', '23503', '23502']);

const iso = (ms: number | null) => (ms === null ? null : new Date(ms).toISOString());
const ms = (value: unknown) => (value === null ? null : Date.parse(value as string));

/** RN-GEN-03: monotonic updated_at per row. */
export const nextUpdatedAt = (previous: number, now: number) => Math.max(now, previous + 1);

const common = (row: WorkoutRow | SetRow) => ({
  id: row.id,
  created_at: iso(row.createdAt),
  updated_at: iso(row.updatedAt),
  deleted_at: iso(row.deletedAt),
});
const commonFromRemote = (r: RemoteRow) => ({
  id: r.id,
  userId: r.user_id as string,
  createdAt: ms(r.created_at)!,
  updatedAt: ms(r.updated_at)!,
  deletedAt: ms(r.deleted_at),
  serverUpdatedAt: ms(r.server_updated_at),
  dirty: false,
  conflict: null,
});

/** Tables in dependency order (07 §4.1). */
const TABLES = [
  {
    remote: 'workouts',
    local: workouts,
    toRemote: (w: WorkoutRow) => ({
      ...common(w),
      routine_name_snapshot: w.routineNameSnapshot,
      status: w.status,
    }),
    fromRemote: (r: RemoteRow) => ({
      ...commonFromRemote(r),
      routineNameSnapshot: r.routine_name_snapshot as string,
      status: r.status as WorkoutRow['status'],
      startedAt: ms(r.created_at)!,
    }),
  },
  {
    remote: 'workout_sets',
    local: workoutSets,
    toRemote: (s: SetRow) => ({
      ...common(s),
      workout_id: s.workoutId,
      position: s.position,
      load_kg: s.loadKg,
      reps: s.reps,
    }),
    fromRemote: (r: RemoteRow) => ({
      ...commonFromRemote(r),
      workoutId: r.workout_id as string,
      position: r.position as number,
      loadKg: r.load_kg as number | null,
      reps: r.reps as number | null,
    }),
  },
] as const;

type Table = (typeof TABLES)[number];

export type SyncStats = { pushed: number; adopted: number; pulled: number; rejected: number };
export type Cursors = Map<string, { ts: string; id: string }>;

function dirtyRows(db: AppDatabase, table: Table, attempted: string[]) {
  if (table.remote === 'workouts') {
    // RN-SYNC-13: an in-progress workout is not uploaded.
    return db
      .select()
      .from(workouts)
      .where(
        and(
          eq(workouts.dirty, true),
          isNull(workouts.conflict),
          eq(workouts.status, 'finished'),
          notInArray(workouts.id, attempted),
        ),
      )
      .limit(PUSH_BATCH)
      .all();
  }
  const held = db
    .select({ id: workouts.id })
    .from(workouts)
    .where(sql`${workouts.status} = 'in_progress' or ${workouts.conflict} is not null`);
  return db
    .select()
    .from(workoutSets)
    .where(
      and(
        eq(workoutSets.dirty, true),
        isNull(workoutSets.conflict),
        notInArray(workoutSets.workoutId, held),
        notInArray(workoutSets.id, attempted),
      ),
    )
    .limit(PUSH_BATCH)
    .all();
}

function adopt(db: AppDatabase, table: Table, remote: RemoteRow, sentUpdatedAt: number) {
  const local = table.local;
  db.transaction((tx) => {
    const current = tx.select().from(local).where(eq(local.id, remote.id)).get();
    // Edited again while the request was in flight: keep it dirty, it goes in the next push.
    if (current && current.updatedAt !== sentUpdatedAt) return;
    tx.update(local)
      .set(table.fromRemote(remote) as never)
      .where(eq(local.id, remote.id))
      .run();
  });
}

async function upsert(client: SupabaseClient, table: Table, rows: object[]) {
  return client.from(table.remote).upsert(rows).select();
}

async function push(db: AppDatabase, client: SupabaseClient, table: Table, stats: SyncStats) {
  // Each row goes out at most once per sync: a row that stays dirty (edited while in flight,
  // or adopted wrong) must not loop forever. It goes in the next sync.
  const attempted: string[] = [];
  for (;;) {
    const rows = dirtyRows(db, table, attempted) as (WorkoutRow & SetRow)[];
    if (rows.length === 0) return;
    attempted.push(...rows.map((r) => r.id));
    const sent = new Map(rows.map((r) => [r.id, r.updatedAt]));
    const { data, error } = await upsert(
      client,
      table,
      rows.map((r) => table.toRemote(r)),
    );
    if (error && !FINAL_REJECTIONS.has(error.code)) throw error; // network/server: abort, retry later
    if (error) {
      // The batch is atomic: retry row by row to find the rejected ones.
      for (const row of rows) {
        const one = await upsert(client, table, [table.toRemote(row)]);
        if (one.error && FINAL_REJECTIONS.has(one.error.code)) {
          db.update(table.local)
            .set({ conflict: one.error.code } as never)
            .where(eq(table.local.id, row.id))
            .run();
          stats.rejected++;
        } else if (one.error) {
          throw one.error;
        } else {
          adopt(db, table, one.data[0] as RemoteRow, sent.get(row.id)!);
          stats.adopted++;
        }
      }
      continue;
    }
    stats.pushed += rows.length;
    for (const remote of data as RemoteRow[]) {
      adopt(db, table, remote, sent.get(remote.id)!);
      stats.adopted++;
    }
  }
}

/** 07 §4.1, client side of LWW and deletes. */
function applyRemote(db: AppDatabase, table: Table, remote: RemoteRow) {
  const local = table.local;
  const incoming = table.fromRemote(remote);
  db.transaction((tx) => {
    const current = tx.select().from(local).where(eq(local.id, remote.id)).get();
    if (remote.deleted_at !== null) {
      // A tombstone always wins, even over a dirty row or a row that doesn't exist (RN-SYNC-04, 15).
      tx.insert(local)
        .values(incoming as never)
        .onConflictDoUpdate({ target: local.id, set: incoming as never })
        .run();
      return;
    }
    if (current?.deletedAt != null) return; // never revives
    if (!current) {
      tx.insert(local)
        .values(incoming as never)
        .run();
      return;
    }
    if (current.dirty && current.updatedAt > incoming.updatedAt) return; // wins on the next push
    tx.update(local)
      .set(incoming as never)
      .where(eq(local.id, remote.id))
      .run();
  });
}

async function pull(
  db: AppDatabase,
  client: SupabaseClient,
  table: Table,
  cursors: Cursors,
  pageSize: number,
  stats: SyncStats,
) {
  const saved = cursors.get(table.remote);
  // The overlap is applied once, at the start (07 §4.1). The cursor keeps the server's string:
  // server_updated_at has microseconds and a JS Date would truncate them.
  let from = saved && {
    ts: new Date(Date.parse(saved.ts) - PULL_OVERLAP_MS).toISOString(),
    id: MIN_UUID,
  };
  for (;;) {
    let query = client
      .from(table.remote)
      .select()
      .order('server_updated_at')
      .order('id')
      .limit(pageSize);
    if (from) {
      query = query.or(
        `server_updated_at.gt."${from.ts}",and(server_updated_at.eq."${from.ts}",id.gt.${from.id})`,
      );
    }
    const { data, error } = await query;
    if (error) throw error;
    const rows = data as RemoteRow[];
    for (const remote of rows) applyRemote(db, table, remote);
    stats.pulled += rows.length;
    if (rows.length > 0) {
      const last = rows[rows.length - 1];
      from = { ts: last.server_updated_at, id: last.id };
    }
    if (rows.length < pageSize) break;
  }
  if (from) cursors.set(table.remote, from);
}

export async function sync(
  db: AppDatabase,
  client: SupabaseClient,
  cursors: Cursors,
  { pageSize = 500 } = {},
): Promise<SyncStats> {
  const stats = emptyStats();
  await pushAll(db, client, stats);
  await pullAll(db, client, cursors, pageSize, stats);
  return stats;
}

const emptyStats = (): SyncStats => ({ pushed: 0, adopted: 0, pulled: 0, rejected: 0 });

export async function pushAll(db: AppDatabase, client: SupabaseClient, stats = emptyStats()) {
  for (const table of TABLES) await push(db, client, table, stats);
  return stats;
}

export async function pullAll(
  db: AppDatabase,
  client: SupabaseClient,
  cursors: Cursors,
  pageSize = 500,
  stats = emptyStats(),
) {
  for (const table of TABLES) await pull(db, client, table, cursors, pageSize, stats);
  return stats;
}
