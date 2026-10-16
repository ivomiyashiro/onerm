import { eq } from 'drizzle-orm';

import { openTestDatabase } from '@/data/db/open-test-database';
import { appState, routines, workouts } from '@/data/db/schema';
import { writeSyncRow } from '@/data/db/sync-writes';
import { ManualTableChanges } from '@/data/db/table-changes';
import { markRestored, markSynced } from '@/data/sync/sync-state-table';
import { SqliteSyncStateRepository } from '@/data/sync/sqlite-sync-state-repository';
import type { LocalSyncState } from '@/domain/repositories/sync-state-repository';

const USER = 'u1';
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

function setUp(owner = USER) {
  const { db } = openTestDatabase();
  db.insert(appState).values({ owner }).run();
  const changes = new ManualTableChanges();
  const seen: LocalSyncState[] = [];
  new SqliteSyncStateRepository(() => db, changes).observe({
    next: (state) => seen.push(state),
    error: () => {},
  });
  let now = 1_760_000_000_000;
  const routine = (id: string) =>
    writeSyncRow(
      db,
      routines,
      { id, name: 'A', sourceTemplateId: null },
      { now: ++now, userId: owner },
    );
  return { db, changes, seen, routine };
}

describe('SqliteSyncStateRepository (RF-SYNC-06)', () => {
  it('nothing pending and never backed up on a fresh device', () => {
    const { seen } = setUp();

    expect(seen).toEqual([
      { pending: 0, conflicts: 0, lastSyncedAt: null, restoreCompleted: false },
    ]);
  });

  it('RF-SYNC-03: the restoration is complete once every user table was pulled to the end', async () => {
    const { db, changes, seen } = setUp();

    markRestored(db);
    changes.emit('sync_state');
    await flush();

    expect(seen.at(-1)?.restoreCompleted).toBe(true);
  });

  it('RN-SYNC-08 and RN-SYNC-11: counts the pending changes and, apart, the rejected ones', async () => {
    const { db, changes, seen, routine } = setUp();
    routine('r1');
    routine('r2');
    db.update(routines).set({ conflict: '23514' }).where(eq(routines.id, 'r2')).run();

    changes.emit('routines');
    await flush();

    expect(seen.at(-1)).toMatchObject({ pending: 1, conflicts: 1, lastSyncedAt: null });
  });

  it('a workout in progress is not pending (RN-SYNC-13)', async () => {
    const { db, changes, seen } = setUp();
    writeSyncRow(
      db,
      workouts,
      {
        id: 'w1',
        routineId: null,
        routineDayId: null,
        routineNameSnapshot: 'A',
        dayNameSnapshot: 'Día A',
        status: 'in_progress',
        startedAt: 1,
        finishedAt: null,
        notes: null,
      },
      { now: 1, userId: USER },
    );

    changes.emit('workouts');
    await flush();

    expect(seen.at(-1)?.pending).toBe(0);
  });

  it('remembers when the last sync ended well', async () => {
    const { db, changes, seen } = setUp();

    markSynced(db, new Date('2026-10-15T12:00:00Z'));
    changes.emit('sync_state');
    await flush();

    expect(seen.at(-1)?.lastSyncedAt).toEqual(new Date('2026-10-15T12:00:00Z'));
  });

  it('a guest has nothing to back up or restore (RN-SYNC-09)', () => {
    const { seen } = setUp('guest');

    expect(seen).toEqual([
      { pending: 0, conflicts: 0, lastSyncedAt: null, restoreCompleted: true },
    ]);
  });
});
