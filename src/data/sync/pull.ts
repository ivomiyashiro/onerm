import type { SupabaseClient } from '@supabase/supabase-js';
import { eq, getTableColumns, or, sql } from 'drizzle-orm';

import type { AppDatabase } from '@/data/db/app-database';
import { profiles, routines } from '@/data/db/schema';
import { pullAction } from '@/domain/rules/sync/conflict-rules';
import { pullStart, serverTimeMs } from '@/domain/rules/sync/sync-timing';

import { assertOwner, SyncNetworkError } from './push';
import { isRestored, readCursor, saveCursor } from './sync-state-table';
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
  /** Called after each page with how many rows it brought (S23's progress). */
  onRows: (count: number) => void = () => {},
): Promise<void> {
  for (const sync of USER_TABLES) {
    await pullTable(db, client, sync, { userId, pageSize, onRows }, (tx, remote) => {
      const table = sync.table as typeof routines;
      const row = remote as RemoteSyncRow;
      const current = tx.select().from(table).where(eq(table.id, row.id)).get() ?? null;
      const incoming = {
        updatedAt: serverTimeMs(row.updated_at),
        deletedAt: row.deleted_at === null ? null : serverTimeMs(row.deleted_at),
      };
      if (pullAction(current, incoming) === 'keep' && !accountProfileWins(tx, sync, current)) {
        return;
      }
      writeRemoteRow(tx, sync, row);
    });
  }
}

/**
 * The catalog's pull (RF-CAT-04, RN-CAT-04), for guests too (RN-SYNC-09): only the server writes
 * it, so every row it sends replaces the local one, unless it is the same (#231).
 */
export async function pullCatalog(db: AppDatabase, client: SupabaseClient): Promise<void> {
  for (const sync of CATALOG_TABLES) {
    await pullTable(
      db,
      client,
      sync,
      { userId: null, pageSize: PULL_PAGE, onRows: () => {} },
      (tx, remote) => writeCatalogRow(tx, sync, remote),
    );
  }
}

/**
 * Like `writeRemoteRow`, but an existing row is only updated when a column differs (#231). The
 * seed loads each catalog table in one upsert, so its rows fall in the overlap of every pull
 * (ADR-0002 R2): rewritten as they are, they would wake every observer of the catalog. The local
 * catalog has no `server_updated_at` to compare, so SQLite compares the values in the same upsert.
 */
function writeCatalogRow(db: AppDatabase, sync: TableSync, remote: RemoteRow) {
  const table = sync.table as typeof routines;
  const values = fromRemote(sync, remote) as typeof routines.$inferInsert;
  const changed = Object.values(getTableColumns(table)).map(
    (column) => sql`${column} is not excluded.${sql.identifier(column.name)}`,
  );
  db.insert(table)
    .values(values)
    .onConflictDoUpdate({ target: table.id, set: values, setWhere: or(...changed) })
    .run();
}

/** Inserts the server's row, or replaces the local one with it. */
export function writeRemoteRow(db: AppDatabase, sync: TableSync, remote: RemoteRow) {
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
  {
    userId,
    pageSize,
    onRows,
  }: { userId: string | null; pageSize: number; onRows: (count: number) => void },
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
      if (userId !== null) assertOwner(tx, userId);
      for (const remote of rows) apply(tx, remote);
      if (last !== undefined) {
        saveCursor(tx, sync.name, { ts: last.server_updated_at, id: last.id });
      }
    });
    if (last !== undefined) from = { ts: last.server_updated_at, id: last.id };
    onRows(rows.length);
    if (rows.length < pageSize) return;
  }
}

/**
 * How many of the user's rows the pull still has to download (S23's total): those after each
 * table's cursor, without the overlap, which only re-reads rows already here.
 */
export async function countToPull(
  db: AppDatabase,
  client: SupabaseClient,
  userId: string,
): Promise<number> {
  let total = 0;
  for (const sync of USER_TABLES) {
    const cursor = readCursor(db, sync.name);
    let query = client
      .from(sync.name)
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    if (cursor !== null) query = query.gt('server_updated_at', cursor.ts);
    const { count, error } = await query;
    if (error !== null) throw new SyncNetworkError(error.message);
    total += count ?? 0;
  }
  return total;
}

/**
 * 07 §4.2 (D1): while the account is being restored, its profile replaces one made on the device
 * that never reached the server («Continuar» after a cut restoration), whatever its updated_at:
 * the account's settings and onboarding are never lost (RN-AUTH-04).
 */
function accountProfileWins(
  db: AppDatabase,
  sync: TableSync,
  local: { serverUpdatedAt: number | null } | null,
): boolean {
  return sync.table === profiles && local?.serverUpdatedAt === null && !isRestored(db);
}
