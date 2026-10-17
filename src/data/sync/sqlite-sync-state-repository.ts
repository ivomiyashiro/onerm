import { and, eq, isNotNull, isNull, or } from 'drizzle-orm';

import type { AppDatabase } from '@/data/db/app-database';
import { observeQuery } from '@/data/db/observe-query';
import { appState, syncState, workoutExercises, workouts, workoutSets } from '@/data/db/schema';
import { currentUserId } from '@/data/db/sync-writes';
import type { TableChanges } from '@/data/db/table-changes';
import type { Id } from '@/domain/models/vocabulary';
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

  observePendingWorkouts(observer: Observer<ReadonlySet<Id>>): Unsubscribe {
    return observeQuery(
      this.changes,
      [workouts, workoutExercises, workoutSets, appState],
      () => {
        const db = this.db();
        const owner = currentUserId(db);
        if (owner === null) return new Set<Id>();
        const rows = db
          .selectDistinct({ id: workouts.id })
          .from(workouts)
          .leftJoin(workoutExercises, eq(workoutExercises.workoutId, workouts.id))
          .leftJoin(workoutSets, eq(workoutSets.workoutExerciseId, workoutExercises.id))
          .where(
            and(
              eq(workouts.status, 'finished'),
              isNull(workouts.deletedAt),
              eq(workouts.userId, owner),
              or(notBackedUp(workouts), notBackedUp(workoutExercises), notBackedUp(workoutSets)),
            ),
          )
          .all();
        return new Set(rows.map((row) => row.id));
      },
      observer,
    );
  }
}

/**
 * Waiting for the push, or rejected by the server: either way, not on the server yet. It reads the
 * same `_dirty` and `_conflict` as `uploadable` in push.ts, which also holds rows back from the
 * push (the workout in progress, a conflict's children): a change to one has to reach the other.
 */
function notBackedUp(table: typeof workouts | typeof workoutExercises | typeof workoutSets) {
  return or(eq(table.dirty, true), isNotNull(table.conflict));
}
