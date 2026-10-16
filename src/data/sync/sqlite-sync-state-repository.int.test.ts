import { eq } from 'drizzle-orm';

import { openTestDatabase } from '@/data/db/open-test-database';
import { appState, routines, workoutExercises, workouts, workoutSets } from '@/data/db/schema';
import { writeSyncRow } from '@/data/db/sync-writes';
import { ManualTableChanges } from '@/data/db/table-changes';
import { markRestored, markSynced } from '@/data/sync/sync-state-table';
import { SqliteWorkoutRepository } from '@/data/repositories/sqlite-workout-repository';
import { SqliteSyncStateRepository } from '@/data/sync/sqlite-sync-state-repository';
import { aBilateralSet, aWorkout, aWorkoutExercise } from '@/domain/testing/builders';
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
      { owner: 'user', pending: 0, conflicts: 0, lastSyncedAt: null, restoreCompleted: false },
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

    expect(seen.at(-1)).toMatchObject({
      owner: 'user',
      pending: 1,
      conflicts: 1,
      lastSyncedAt: null,
    });
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
      { owner: 'guest', pending: 0, conflicts: 0, lastSyncedAt: null, restoreCompleted: true },
    ]);
  });

  describe('observePendingWorkouts (RF-PROG-01.AC2)', () => {
    async function withWorkouts(owner = USER) {
      const { db, changes } = setUp(owner);
      const repository = new SqliteWorkoutRepository(
        () => db,
        changes,
        () => 1_760_000_000_000,
      );
      const workout = (id: string, status: 'finished' | 'in_progress' = 'finished') =>
        repository.save(
          aWorkout({
            id,
            routineId: null,
            routineDayId: null,
            status,
            finishedAt: status === 'finished' ? new Date('2026-10-05T12:00:00Z') : null,
            exercises: [
              aWorkoutExercise({
                id: `${id}-we`,
                workoutId: id,
                sets: [aBilateralSet({ id: `${id}-s`, workoutExerciseId: `${id}-we` })],
              }),
            ],
          }),
        );
      await workout('backed-up');
      await workout('edited');
      await workout('rejected');
      await workout('new');
      await workout('running', 'in_progress');
      // Everything went up, then a set of «edited» changed and «rejected» came back rejected.
      for (const table of [workouts, workoutExercises, workoutSets]) {
        db.update(table).set({ dirty: false }).run();
      }
      db.update(workoutSets).set({ dirty: true }).where(eq(workoutSets.id, 'edited-s')).run();
      db.update(workouts).set({ conflict: '23514' }).where(eq(workouts.id, 'rejected')).run();
      db.update(workouts).set({ dirty: true }).where(eq(workouts.id, 'new')).run();
      db.update(workouts).set({ dirty: true }).where(eq(workouts.id, 'running')).run();

      let pending: ReadonlySet<string> = new Set();
      new SqliteSyncStateRepository(() => db, changes).observePendingWorkouts({
        next: (ids) => (pending = ids),
        error: () => {},
      });
      return { db, changes, pending: () => [...pending].sort() };
    }

    it('the finished workouts with a row of their own, an exercise or a set not backed up', async () => {
      const { pending } = await withWorkouts();

      expect(pending()).toEqual(['edited', 'new', 'rejected']);
    });

    it('a workout leaves the list once it is backed up', async () => {
      const { db, changes, pending } = await withWorkouts();

      db.update(workoutSets).set({ dirty: false }).run();
      db.update(workouts).set({ dirty: false, conflict: null }).run();
      changes.emit('workout_sets');
      await flush();

      expect(pending()).toEqual([]);
    });

    it('a guest backs up nothing, so nothing is pending', async () => {
      const { pending } = await withWorkouts('guest');

      expect(pending()).toEqual([]);
    });
  });
});
