import { eq } from 'drizzle-orm';

import type { AppDatabase } from '@/data/db/app-database';
import { syncState } from '@/data/db/schema';
import type { PullCursor } from '@/domain/rules/sync/sync-timing';

import { USER_TABLES } from './sync-tables';

/** Where a table's pull resumes, from `sync_state` (07 §2.4): one row per synced table. */
export function readCursor(db: AppDatabase, name: string): PullCursor | null {
  const stored = db.select().from(syncState).where(eq(syncState.tableName, name)).get()?.cursor;
  return stored ? (JSON.parse(stored) as PullCursor) : null;
}

export function saveCursor(db: AppDatabase, name: string, cursor: PullCursor) {
  const value = JSON.stringify(cursor);
  db.insert(syncState)
    .values({ tableName: name, cursor: value })
    .onConflictDoUpdate({ target: syncState.tableName, set: { cursor: value } })
    .run();
}

/** A sync of the user's tables ended well at `at` («Respaldado · hace…», RF-SYNC-06). */
export function markSynced(db: AppDatabase, at: Date) {
  const lastSuccessAt = at.getTime();
  db.transaction((tx) => {
    for (const { name } of USER_TABLES) {
      tx.insert(syncState)
        .values({ tableName: name, lastSuccessAt })
        .onConflictDoUpdate({ target: syncState.tableName, set: { lastSuccessAt } })
        .run();
    }
  });
}

/** When the last sync of the user's tables ended well, or null. */
export function lastSyncedAt(db: AppDatabase): Date | null {
  const rows = db.select({ at: syncState.lastSuccessAt }).from(syncState).all();
  const times = rows.map(({ at }) => at).filter((at): at is number => at !== null);
  return times.length === 0 ? null : new Date(Math.max(...times));
}
