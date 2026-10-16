import type { AppDatabase } from '@/data/db/app-database';
import { observeQuery } from '@/data/db/observe-query';
import { appState, syncState } from '@/data/db/schema';
import { currentUserId } from '@/data/db/sync-writes';
import type { TableChanges } from '@/data/db/table-changes';
import type { Observer, Unsubscribe } from '@/domain/repositories/observer';
import type {
  LocalSyncState,
  SyncStateRepository,
} from '@/domain/repositories/sync-state-repository';

import { countConflicts, countUploadable } from './push';
import { isRestored, lastSyncedAt } from './sync-state-table';
import { USER_TABLES } from './sync-tables';

/** The backup state as the local database tells it, read again on every write (RF-SYNC-06). */
export class SqliteSyncStateRepository implements SyncStateRepository {
  constructor(
    private readonly db: () => AppDatabase,
    private readonly changes: TableChanges,
  ) {}

  observe(observer: Observer<LocalSyncState>): Unsubscribe {
    return observeQuery(
      this.changes,
      [...USER_TABLES.map((sync) => sync.table), syncState, appState],
      () => {
        const db = this.db();
        const owner = currentUserId(db);
        return {
          owner: owner === null ? 'guest' : 'user',
          pending: owner === null ? 0 : countUploadable(db, owner),
          conflicts: owner === null ? 0 : countConflicts(db, owner),
          lastSyncedAt: lastSyncedAt(db),
          restoreCompleted: owner === null || isRestored(db),
        };
      },
      observer,
    );
  }
}
