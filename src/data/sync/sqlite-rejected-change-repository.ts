import type { SupabaseClient } from '@supabase/supabase-js';
import { and, eq, inArray, isNotNull } from 'drizzle-orm';

import type { AppDatabase } from '@/data/db/app-database';
import { observeQuery } from '@/data/db/observe-query';
import { routines } from '@/data/db/schema';
import { currentUserId } from '@/data/db/sync-writes';
import type { TableChanges } from '@/data/db/table-changes';
import type { RecordKind, RejectedChange } from '@/domain/models/rejected-change';
import type { Observer, Unsubscribe } from '@/domain/repositories/observer';
import type { RejectedChangeRepository } from '@/domain/repositories/rejected-change-repository';

import { writeRemoteRow } from './pull';
import { USER_TABLES, type RemoteRow, type UserTableSync } from './sync-tables';

/** The kind of record each user table holds, in the order of USER_TABLES. */
const KINDS: readonly RecordKind[] = [
  'profile',
  'routine',
  'routineDay',
  'routineExercise',
  'workout',
  'workoutExercise',
  'workoutSet',
];

const syncOf = (kind: RecordKind) => USER_TABLES[KINDS.indexOf(kind)];

/** The name a record shows, for the tables whose rows have one. */
const NAMES: Readonly<Record<string, (row: Record<string, unknown>) => string>> = {
  routines: (row) => row.name as string,
  routine_days: (row) => row.name as string,
  workouts: (row) => row.dayNameSnapshot as string,
};

/** The rejected changes on the local database (RN-SYNC-11), with the server for discarding. */
export class SqliteRejectedChangeRepository implements RejectedChangeRepository {
  constructor(
    private readonly db: () => AppDatabase,
    private readonly changes: TableChanges,
    /** Null without a server configured. */
    private readonly client: SupabaseClient | null,
  ) {}

  observe(observer: Observer<RejectedChange[]>): Unsubscribe {
    return observeQuery(
      this.changes,
      USER_TABLES.map((sync) => sync.table),
      () => this.read(),
      observer,
    );
  }

  async discard(change: RejectedChange): Promise<'done' | 'offline'> {
    const sync = syncOf(change.kind);
    if (!change.uploadedBefore) {
      this.deleteWithDependents(sync, change.id);
      return 'done';
    }
    if (this.client === null) return 'offline';
    const { data, error } = await this.client
      .from(sync.name)
      .select()
      .eq('id', change.id)
      .maybeSingle();
    if (error !== null) return 'offline';
    // The server has no copy (it never stored it): nothing to go back to.
    if (data === null) this.deleteWithDependents(sync, change.id);
    else this.db().transaction((tx) => writeRemoteRow(tx, sync, data as RemoteRow));
    return 'done';
  }

  async retry(change: RejectedChange): Promise<void> {
    const table = syncOf(change.kind).table as typeof routines;
    this.db()
      .update(table)
      .set({ conflict: null, dirty: true })
      .where(eq(table.id, change.id))
      .run();
  }

  private read(): RejectedChange[] {
    const db = this.db();
    const owner = currentUserId(db);
    if (owner === null) return [];
    return USER_TABLES.flatMap((sync, index) => {
      const table = sync.table as typeof routines;
      const rows = db
        .select()
        .from(table)
        .where(and(isNotNull(table.conflict), eq(table.userId, owner)))
        .all() as unknown as (Record<string, unknown> & {
        id: string;
        conflict: string;
        serverUpdatedAt: number | null;
      })[];
      return rows.map((row) => ({
        kind: KINDS[index],
        id: row.id,
        reason: row.conflict,
        name: NAMES[sync.name]?.(row) ?? null,
        uploadedBefore: row.serverUpdatedAt !== null,
        dependents: dependentIds(db, sync, [row.id]).length,
      }));
    });
  }

  /**
   * RN-SYNC-11 and RN-SYNC-15: a row that never reached the server is deleted physically, with
   * the rows under it, which can't have reached it either (the server checks the parent).
   */
  private deleteWithDependents(sync: UserTableSync, id: string) {
    this.db().transaction((tx) => {
      const byTable = dependentsByTable(tx, sync, [id]);
      // Children first: the foreign keys are on.
      for (const [child, ids] of [...byTable].reverse()) {
        const table = child.table as typeof routines;
        tx.delete(table).where(inArray(table.id, ids)).run();
      }
      const table = sync.table as typeof routines;
      tx.delete(table).where(eq(table.id, id)).run();
    });
  }
}

/** The rows under `ids`, at every level, by table from the closest to the farthest. */
function dependentsByTable(
  db: AppDatabase,
  sync: UserTableSync,
  ids: string[],
): Map<UserTableSync, string[]> {
  const found = new Map<UserTableSync, string[]>();
  for (const child of USER_TABLES.filter((candidate) => candidate.parent?.sync === sync)) {
    const table = child.table as typeof routines;
    const childIds = db
      .select({ id: table.id })
      .from(table)
      .where(inArray(child.parent!.column, ids))
      .all()
      .map((row) => row.id);
    if (childIds.length === 0) continue;
    found.set(child, childIds);
    for (const [deeper, deeperIds] of dependentsByTable(db, child, childIds)) {
      found.set(deeper, deeperIds);
    }
  }
  return found;
}

function dependentIds(db: AppDatabase, sync: UserTableSync, ids: string[]): string[] {
  return [...dependentsByTable(db, sync, ids).values()].flat();
}
