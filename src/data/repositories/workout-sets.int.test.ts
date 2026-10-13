import { openTestDatabase, type TestDatabase } from '@/data/db/open-test-database';
import { ManualTableChanges } from '@/data/db/table-changes';
import { SqliteWorkoutRepository } from '@/data/repositories/sqlite-workout-repository';
import type { Workout } from '@/domain/models/workout';
import { aWorkout, aWorkoutExercise } from '@/domain/testing/builders';
import { firstValue } from '@/domain/usecases/observe-together';
import { DeleteSet, LogSet, RestoreSet } from '@/domain/usecases/workout-sets';

const SET = { isUnilateral: false, loadKg: 60, reps: 8, rir: null, isWarmup: false } as const;

let t: TestDatabase;
let repository: SqliteWorkoutRepository;

beforeEach(async () => {
  t = openTestDatabase();
  repository = new SqliteWorkoutRepository(
    () => t.db,
    new ManualTableChanges(),
    () => 0,
  );
  await repository.save(
    aWorkout({
      id: 'w',
      status: 'in_progress',
      finishedAt: null,
      exercises: [aWorkoutExercise({ id: 'we', workoutId: 'w' })],
    }),
  );
});

afterEach(() => t.sqlite.close());

const sets = async () =>
  (await firstValue<Workout | null>((o) => repository.observeInProgress(o)))!.exercises[0].sets;

describe('the set use cases on SQLite', () => {
  it('RF-ENT-02.AC6, RF-ENT-04.AC2: logged sets persist, and undo brings a deleted one back', async () => {
    let n = 0;
    const newId = () => `set-${++n}`;
    const logSet = new LogSet(repository, newId, () => new Date('2026-10-13T18:00:00Z'));
    await logSet.execute('we', SET);
    await logSet.execute('we', { ...SET, reps: 7 });

    const deleted = await new DeleteSet(repository).execute('set-1');
    expect((await sets()).map((s) => s.id)).toEqual(['set-2']);

    // The deleted row stays as a tombstone (RN-SYNC-15): the restored set is a new row.
    await new RestoreSet(repository, newId).execute(deleted!);
    expect((await sets()).map((s) => [s.id, s.position])).toEqual([
      ['set-3', 0],
      ['set-2', 1],
    ]);
  });
});
