import { and, eq, isNull, sql, type SQL } from 'drizzle-orm';

import type { AppDatabase } from './app-database';
import {
  appState,
  profiles,
  routineDays,
  routineExercises,
  routines,
  workoutExercises,
  workouts,
  workoutSets,
} from './schema';
import { nextUpdatedAt } from './updated-at';

/** The tables the user writes and the sync pushes (07 §2.2). */
export type SyncTable =
  | typeof profiles
  | typeof routines
  | typeof routineDays
  | typeof routineExercises
  | typeof workouts
  | typeof workoutExercises
  | typeof workoutSets;

type SyncColumn =
  'userId' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'serverUpdatedAt' | 'dirty' | 'conflict';

/** The columns a repository writes: the row's own data, without the sync columns of 07 §2.1. */
export type SyncValues<T extends SyncTable> = Omit<T['$inferInsert'], SyncColumn> & { id: string };

export interface WriteContext {
  /** ms since the epoch, from the injected clock. */
  now: number;
  /** The owner: null for a guest (07 §2.1). */
  userId: string | null;
}

export type WriteResult = 'inserted' | 'updated' | 'unchanged' | 'deleted';

/** The `user_id` of new rows: null while the owner is a guest (07 §2.4, `app_state.owner`). */
export function currentUserId(db: AppDatabase): string | null {
  const owner = db.select({ owner: appState.owner }).from(appState).get()?.owner ?? 'guest';
  return owner === 'guest' ? null : owner;
}

/**
 * Writes one row of an aggregate with the rules the sync relies on (07 §2.1, §4):
 * - a new row is inserted pending push (`_dirty`), with the owner;
 * - a changed row gets a monotonic `updated_at` (RN-GEN-03) and is pending push again;
 * - an unchanged row is not touched, so the sync doesn't push it again;
 * - a deleted row never comes back (RN-SYNC-15), and keeps its owner.
 * Run it inside the transaction of the domain operation.
 */
export function writeSyncRow<T extends SyncTable>(
  db: AppDatabase,
  table: T,
  values: SyncValues<T>,
  { now, userId }: WriteContext,
): WriteResult {
  // The union of tables is too wide for Drizzle's overloads; every SyncTable has these columns.
  const anyTable = table as typeof routines;
  const existing = db.select().from(anyTable).where(eq(anyTable.id, values.id)).get() as
    (Record<string, unknown> & { updatedAt: number; deletedAt: number | null }) | undefined;

  if (existing === undefined) {
    db.insert(anyTable)
      .values({
        ...(values as SyncValues<typeof routines>),
        userId,
        createdAt: now,
        updatedAt: now,
        dirty: true,
      })
      .run();
    return 'inserted';
  }
  if (existing.deletedAt !== null) return 'deleted';
  if (sameValues(existing, values)) return 'unchanged';

  db.update(anyTable)
    .set({
      ...(values as SyncValues<typeof routines>),
      updatedAt: nextUpdatedAt(now, existing.updatedAt),
      dirty: true,
    })
    .where(eq(anyTable.id, values.id))
    .run();
  return 'updated';
}

/**
 * Logical delete of the live rows that match `where` (RN-SYNC-15): `deleted_at`, a monotonic
 * `updated_at` per row (RN-GEN-03, in SQL) and pending push. Rows already deleted are left as
 * they are. The client never deletes physically.
 */
export function softDelete(db: AppDatabase, table: SyncTable, where: SQL | undefined, now: number) {
  const anyTable = table as typeof routines;
  db.update(anyTable)
    .set({
      deletedAt: now,
      updatedAt: sql`max(${now}, ${anyTable.updatedAt} + 1)`,
      dirty: true,
    })
    .where(and(where, isNull(anyTable.deletedAt)))
    .run();
}

/** Whether the stored row already has these values. A missing optional value counts as null. */
function sameValues(row: Record<string, unknown>, values: Record<string, unknown>): boolean {
  return Object.entries(values).every(
    ([key, value]) => JSON.stringify(value ?? null) === JSON.stringify(row[key] ?? null),
  );
}
