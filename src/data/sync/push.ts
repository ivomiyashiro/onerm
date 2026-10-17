import type { SupabaseClient } from '@supabase/supabase-js';
import {
  and,
  asc,
  count,
  eq,
  gt,
  inArray,
  isNotNull,
  isNull,
  ne,
  notInArray,
  or,
  type SQL,
} from 'drizzle-orm';

import type { AppDatabase } from '@/data/db/app-database';
import { profiles, routines, workouts } from '@/data/db/schema';
import { currentUserId } from '@/data/db/sync-writes';
import { adoptsServerRow } from '@/domain/rules/sync/conflict-rules';
import {
  uploadIsolatingRejections,
  type UploadOutcome,
} from '@/domain/rules/sync/isolate-rejections';

import {
  fromRemote,
  toRemote,
  USER_TABLES,
  type RemoteRow,
  type UserTableSync,
} from './sync-tables';
import { isRestored } from './sync-state-table';

/** Rows per upsert (07 §4.1). */
const PUSH_BATCH = 200;

/** Thrown when the network or the server fails: the sync aborts and is retried later. */
export class SyncNetworkError extends Error {}

/** Thrown when the device stopped being this account's mid-sync (signing out): it aborts. */
export class OwnerChangedError extends Error {}

/**
 * RN-AUTH-07: nothing of an account is written once the device isn't its anymore. The sync checks
 * the owner when it starts, but a sign-out can clear the device while a request is in flight.
 */
export function assertOwner(db: AppDatabase, userId: string) {
  if (currentUserId(db) !== userId) throw new OwnerChangedError();
}

/**
 * The push of 07 §4.1: the pending rows go up in dependency order, in batches, and each row comes
 * back as the server stored it and is adopted (ADR-0002 6b). Rows of another owner, a workout in
 * progress and the rows under a row in conflict stay on the device. Each row goes out at most once
 * per push: one that stays pending (edited in flight) waits for the next sync (spike #13).
 */
export async function pushChanges(
  db: AppDatabase,
  client: SupabaseClient,
  userId: string,
): Promise<void> {
  for (const sync of USER_TABLES) {
    // The union of tables is too wide for Drizzle's overloads; every user table has these columns.
    const table = sync.table as typeof routines;
    let afterId = '';
    for (;;) {
      const rows = db
        .select()
        .from(table)
        .where(and(uploadable(db, sync, userId), gt(table.id, afterId)))
        .orderBy(asc(table.id))
        .limit(PUSH_BATCH)
        .all() as Record<string, unknown>[] as (typeof routines.$inferSelect)[];
      if (rows.length === 0) break;
      afterId = rows[rows.length - 1].id;

      const sent = new Map(rows.map((row) => [row.id, row.updatedAt]));
      const { accepted, rejected } = await uploadIsolatingRejections(rows, (batch) =>
        upsert(
          client,
          sync.name,
          batch.map((row) => toRemote(sync, row)),
        ),
      );

      db.transaction((tx) => {
        assertOwner(tx, userId);
        for (const remote of accepted) {
          const current = tx.select().from(table).where(eq(table.id, remote.id)).get() ?? null;
          if (!adoptsServerRow(sent.get(remote.id)!, current)) continue;
          tx.update(table)
            .set(fromRemote(sync, remote) as typeof routines.$inferInsert)
            .where(eq(table.id, remote.id))
            .run();
        }
        for (const { row, reason } of rejected) {
          tx.update(table).set({ conflict: reason }).where(eq(table.id, row.id)).run();
        }
      });
    }
  }
}

/**
 * The rows the next push would upload (RN-SYNC-08): what makes a local write worth a sync
 * (RN-SYNC-06 a). Rows in conflict and the ones they hold don't count: they wait for the person.
 */
export function countUploadable(db: AppDatabase, userId: string): number {
  return USER_TABLES.reduce((total, sync) => {
    const table = sync.table as typeof routines;
    const row = db
      .select({ n: count() })
      .from(table)
      .where(uploadable(db, sync, userId))
      .get();
    return total + (row?.n ?? 0);
  }, 0);
}

/** The rows of this owner the server rejected (RN-SYNC-11). */
export function countConflicts(db: AppDatabase, userId: string): number {
  return USER_TABLES.reduce((total, sync) => {
    const table = sync.table as typeof routines;
    const row = db
      .select({ n: count() })
      .from(table)
      .where(and(isNotNull(table.conflict), eq(table.userId, userId)))
      .get();
    return total + (row?.n ?? 0);
  }, 0);
}

/**
 * Pending, of this owner, not in conflict and not held back. `notBackedUp` in
 * sqlite-sync-state-repository.ts reads the same columns for the history's «Pendiente».
 */
function uploadable(db: AppDatabase, sync: UserTableSync, userId: string): SQL | undefined {
  const table = sync.table as typeof routines;
  return and(
    eq(table.dirty, true),
    isNull(table.conflict),
    eq(table.userId, userId),
    pushable(db, sync),
    // 07 §4.2 (D1): while the account is being restored, a profile made on the device (never on
    // the server) waits: the account's own may still be on its way, and it wins.
    sync.table === profiles && !isRestored(db) ? isNotNull(profiles.serverUpdatedAt) : undefined,
  );
}

/** Not held back: not a workout in progress (RN-SYNC-13), nor under a held row (RN-SYNC-11). */
function pushable(db: AppDatabase, sync: UserTableSync): SQL | undefined {
  const own = sync.table === workouts ? eq(workouts.status, 'finished') : undefined;
  if (sync.parent === undefined) return own;
  return and(own, notInArray(sync.parent.column, heldIds(db, sync.parent.sync)));
}

/**
 * The ids of the rows whose children can't go up: in conflict, a workout not finished, or held
 * themselves because of their own parent (at any level, RN-SYNC-11).
 */
function heldIds(db: AppDatabase, sync: UserTableSync) {
  const table = sync.table as typeof routines;
  const held: SQL[] = [isNotNull(table.conflict)];
  if (sync.table === workouts) held.push(ne(workouts.status, 'finished'));
  if (sync.parent !== undefined) {
    held.push(inArray(sync.parent.column, heldIds(db, sync.parent.sync)));
  }
  return db
    .select({ id: table.id })
    .from(table)
    .where(or(...held));
}

/** One upsert that returns the rows as stored (07 §3). A validation rejection is not an error. */
async function upsert(
  client: SupabaseClient,
  name: string,
  rows: RemoteRow[],
): Promise<UploadOutcome<RemoteRow>> {
  const { data, error } = await client.from(name).upsert(rows).select();
  if (error === null) return { status: 'accepted', rows: data as RemoteRow[] };
  if (isRejection(error.code)) return { status: 'rejected', reason: error.code };
  throw new SyncNetworkError(error.message);
}

/**
 * A rejection that retrying won't fix (RN-SYNC-11): a constraint of class 23 (CHECK, FK, NOT NULL,
 * UNIQUE) or a row-level security denial (42501). Anything else is the network or the server.
 */
function isRejection(code: string | undefined): boolean {
  return code !== undefined && (code.startsWith('23') || code === '42501');
}
