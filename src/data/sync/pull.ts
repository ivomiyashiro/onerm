import type { SupabaseClient } from '@supabase/supabase-js';
import { eq } from 'drizzle-orm';

import type { AppDatabase } from '@/data/db/app-database';
import { routines, syncState } from '@/data/db/schema';
import { pullAction } from '@/domain/rules/sync/conflict-rules';
import { pullStart, serverTimeMs, type PullCursor } from '@/domain/rules/sync/sync-timing';

import { SyncNetworkError } from './push';
import {
  CATALOG_TABLES,
  fromRemote,
  USER_TABLES,
  type RemoteRow,
  type RemoteSyncRow,
  type TableSync,
} from './sync-tables';

/** Rows per page of the pull (07 §4.1). */
const PULL_PAGE = 500;

/**
 * The pull of 07 §4.1 for the user's tables, in dependency order: each remote row goes through the
 * client side of LWW and deletes (`pullAction`). The server only holds finished workouts
 * (RN-SYNC-13), so nothing else needs filtering.
 */
export async function pullChanges(
  db: AppDatabase,
  client: SupabaseClient,
  userId: string,
  pageSize = PULL_PAGE,
): Promise<void> {
  for (const sync of USER_TABLES) {
    await pullTable(db, client, sync, { userId, pageSize }, (tx, remote) => {
      const table = sync.table as typeof routines;
      const current = tx.select().from(table).where(eq(table.id, remote.id)).get() ?? null;
      const incoming = {
        updatedAt: serverTimeMs((remote as RemoteSyncRow).updated_at),
        deletedAt:
          (remote as RemoteSyncRow).deleted_at === null
            ? null
            : serverTimeMs((remote as RemoteSyncRow).deleted_at!),
      };
      if (pullAction(current, incoming) === 'keep') return;
      write(tx, sync, remote);
    });
  }
}

/**
 * The catalog's pull (RF-CAT-04, RN-CAT-04), for guests too (RN-SYNC-09): only the server writes
 * it, so every row it sends replaces the local one.
 */
export async function pullCatalog(db: AppDatabase, client: SupabaseClient): Promise<void> {
  for (const sync of CATALOG_TABLES) {
    await pullTable(db, client, sync, { userId: null, pageSize: PULL_PAGE }, (tx, remote) =>
      write(tx, sync, remote),
    );
  }
}

/** Inserts the server's row, or replaces the local one with it. */
function write(db: AppDatabase, sync: TableSync, remote: RemoteRow) {
  const table = sync.table as typeof routines;
  const values = fromRemote(sync, remote) as typeof routines.$inferInsert;
  db.insert(table).values(values).onConflictDoUpdate({ target: table.id, set: values }).run();
}

/**
 * Keyset pagination by `(server_updated_at, id)` (07 §4.1, ADR-0002 R9): the overlap is applied
 * once, at the start, and each page continues after the last row of the previous one. Each page is
 * applied in one transaction with its cursor, so an interrupted pull keeps what it got and resumes
 * there (RF-SYNC-03.AC2).
 */
async function pullTable(
  db: AppDatabase,
  client: SupabaseClient,
  sync: TableSync,
  { userId, pageSize }: { userId: string | null; pageSize: number },
  apply: (tx: AppDatabase, remote: RemoteRow) => void,
): Promise<void> {
  let from = pullStart(readCursor(db, sync.name));
  for (;;) {
    let query = client
      .from(sync.name)
      .select()
      .order('server_updated_at')
      .order('id')
      .limit(pageSize);
    // RLS already limits it to the user's rows; the filter lets the server use its pull index.
    if (userId !== null) query = query.eq('user_id', userId);
    if (from !== null) {
      query = query.or(
        `server_updated_at.gt."${from.ts}",and(server_updated_at.eq."${from.ts}",id.gt.${from.id})`,
      );
    }
    const { data, error } = await query;
    if (error !== null) throw new SyncNetworkError(error.message);

    const rows = data as RemoteSyncRow[];
    const last = rows.at(-1);
    db.transaction((tx) => {
      for (const remote of rows) apply(tx, remote);
      if (last !== undefined) {
        saveCursor(tx, sync.name, { ts: last.server_updated_at, id: last.id });
      }
    });
    if (last !== undefined) from = { ts: last.server_updated_at, id: last.id };
    if (rows.length < pageSize) return;
  }
}

function readCursor(db: AppDatabase, name: string): PullCursor | null {
  const stored = db.select().from(syncState).where(eq(syncState.tableName, name)).get()?.cursor;
  return stored ? (JSON.parse(stored) as PullCursor) : null;
}

function saveCursor(db: AppDatabase, name: string, cursor: PullCursor) {
  const value = JSON.stringify(cursor);
  db.insert(syncState)
    .values({ tableName: name, cursor: value })
    .onConflictDoUpdate({ target: syncState.tableName, set: { cursor: value } })
    .run();
}
