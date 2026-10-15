import { getTableColumns, getTableName } from 'drizzle-orm';
import type { SQLiteColumn, SQLiteTable } from 'drizzle-orm/sqlite-core';

import {
  exercises,
  profiles,
  routineDays,
  routineExercises,
  routines,
  routineTemplates,
  templateDays,
  templateExercises,
  workoutExercises,
  workouts,
  workoutSets,
} from '@/data/db/schema';
import type { SyncTable } from '@/data/db/sync-writes';
import { serverTimeMs } from '@/domain/rules/sync/sync-timing';

/** A row as PostgREST sends and receives it: snake_case columns, times as ISO strings. */
export type RemoteRow = Record<string, unknown> & { id: string };

/** A synced row of the server, with the columns the sync reads (07 §2.1). */
export type RemoteSyncRow = RemoteRow & {
  updated_at: string;
  deleted_at: string | null;
  server_updated_at: string;
};

/** How a local table maps to the server's table of the same name. */
export interface TableSync<T extends SQLiteTable = SQLiteTable> {
  name: string;
  table: T;
  /** The columns stored as ms locally and as `timestamptz` on the server. */
  times: ReadonlySet<string>;
}

/** A user table (07 §2.2), with the parent whose conflict holds its rows back (RN-SYNC-11). */
export interface UserTableSync extends TableSync<SyncTable> {
  parent?: { sync: UserTableSync; column: SQLiteColumn };
}

const SYNC_TIMES = ['created_at', 'updated_at', 'deleted_at', 'server_updated_at'];

function tableSync<T extends SQLiteTable>(table: T, times: string[] = []): TableSync<T> {
  return { name: getTableName(table), table, times: new Set(times) };
}

function userTable(
  table: SyncTable,
  times: string[] = [],
  parent?: UserTableSync['parent'],
): UserTableSync {
  return { ...tableSync(table, [...SYNC_TIMES, ...times]), parent };
}

const PROFILES = userTable(profiles, ['onboarding_completed_at']);
const ROUTINES = userTable(routines);
const ROUTINE_DAYS = userTable(routineDays, [], { sync: ROUTINES, column: routineDays.routineId });
const ROUTINE_EXERCISES = userTable(routineExercises, [], {
  sync: ROUTINE_DAYS,
  column: routineExercises.routineDayId,
});
const WORKOUTS = userTable(workouts, ['started_at', 'finished_at']);
const WORKOUT_EXERCISES = userTable(workoutExercises, [], {
  sync: WORKOUTS,
  column: workoutExercises.workoutId,
});
const WORKOUT_SETS = userTable(workoutSets, ['completed_at'], {
  sync: WORKOUT_EXERCISES,
  column: workoutSets.workoutExerciseId,
});

/** The user tables in dependency order, parents before children (07 §4.1, ADR-0002 R5). */
export const USER_TABLES: readonly UserTableSync[] = [
  PROFILES,
  ROUTINES,
  ROUTINE_DAYS,
  ROUTINE_EXERCISES,
  WORKOUTS,
  WORKOUT_EXERCISES,
  WORKOUT_SETS,
];

/** The catalog tables, read-only in the app (07 §2.3), also in dependency order. */
export const CATALOG_TABLES: readonly TableSync[] = [
  tableSync(exercises, ['deprecated_at']),
  tableSync(routineTemplates),
  tableSync(templateDays),
  tableSync(templateExercises),
];

/** Columns that never leave the device (`_dirty`, `_conflict`) or that the server assigns. */
const NOT_SENT = new Set(['_dirty', '_conflict', 'server_updated_at', 'user_id']);

const toIso = (ms: unknown) => (ms === null ? null : new Date(ms as number).toISOString());

/** Local row → the row the push upserts. The server sets `user_id` and the cursor (07 §3). */
export function toRemote(sync: TableSync, row: Record<string, unknown>): RemoteRow {
  const remote: Record<string, unknown> = {};
  for (const [key, column] of Object.entries(getTableColumns(sync.table))) {
    if (NOT_SENT.has(column.name)) continue;
    remote[column.name] = sync.times.has(column.name) ? toIso(row[key]) : row[key];
  }
  return remote as RemoteRow;
}

/**
 * The server's row → local values, for every column of the local table. A row that comes from the
 * server is up to date with it: not pending and without conflict.
 */
export function fromRemote(sync: TableSync, remote: RemoteRow): Record<string, unknown> {
  const local: Record<string, unknown> = {};
  for (const [key, column] of Object.entries(getTableColumns(sync.table))) {
    if (column.name === '_dirty') local[key] = false;
    else if (column.name === '_conflict') local[key] = null;
    else {
      const value = remote[column.name] ?? null;
      local[key] =
        sync.times.has(column.name) && value !== null ? serverTimeMs(value as string) : value;
    }
  }
  return local;
}
