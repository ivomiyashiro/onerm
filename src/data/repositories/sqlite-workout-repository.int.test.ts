import { eq } from 'drizzle-orm';

import { openTestDatabase, type TestDatabase } from '@/data/db/open-test-database';
import { appState, workoutExercises, workouts, workoutSets } from '@/data/db/schema';
import { ManualTableChanges } from '@/data/db/table-changes';
import { SqliteWorkoutRepository } from '@/data/repositories/sqlite-workout-repository';
import type { Workout } from '@/domain/models/workout';
import {
  aBilateralSet,
  aUnilateralSet,
  aWorkout,
  aWorkoutExercise,
} from '@/domain/testing/builders';

const T0 = 1_780_000_000_000;
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/** A finished workout: a bilateral squat with two sets and a unilateral row with one. */
const FINISHED: Workout = aWorkout({
  id: 'w1',
  status: 'finished',
  startedAt: new Date('2026-10-05T11:00:00Z'),
  finishedAt: new Date('2026-10-05T12:00:00Z'),
  notes: 'Buen día',
  exercises: [
    aWorkoutExercise({
      id: 'we1',
      workoutId: 'w1',
      position: 1,
      status: 'done',
      sets: [
        aBilateralSet({
          id: 's1',
          workoutExerciseId: 'we1',
          position: 1,
          loadKg: 60,
          reps: 8,
          rir: 2,
        }),
        aBilateralSet({
          id: 's2',
          workoutExerciseId: 'we1',
          position: 2,
          loadKg: 62.5,
          reps: 7,
          rir: null,
        }),
      ],
    }),
    aWorkoutExercise({
      id: 'we2',
      workoutId: 'w1',
      routineExerciseId: null,
      plannedExerciseId: null,
      exerciseId: 'one-arm-row',
      position: 2,
      status: 'done',
      isUnilateral: true,
      sets: [
        aUnilateralSet({
          id: 's3',
          workoutExerciseId: 'we2',
          position: 1,
          repsLeft: 10,
          repsRight: 9,
          rirLeft: 2,
          rirRight: null,
          isWarmup: true,
        }),
      ],
    }),
  ],
});

const IN_PROGRESS: Workout = aWorkout({
  id: 'w2',
  status: 'in_progress',
  startedAt: new Date('2026-10-07T11:00:00Z'),
  finishedAt: null,
  exercises: [aWorkoutExercise({ id: 'we3', workoutId: 'w2', status: 'pending', sets: [] })],
});

let t: TestDatabase;
let changes: ManualTableChanges;
let now: number;
let repository: SqliteWorkoutRepository;

beforeEach(() => {
  t = openTestDatabase();
  changes = new ManualTableChanges();
  now = T0;
  repository = new SqliteWorkoutRepository(
    () => t.db,
    changes,
    () => now,
  );
});

afterEach(() => {
  t.sqlite.close();
});

function last<T>(
  subscribe: (observer: { next(value: T): void; error(e: unknown): void }) => unknown,
) {
  const values: T[] = [];
  subscribe({ next: (value) => values.push(value), error: jest.fn() });
  return () => values[values.length - 1];
}

const TABLES = [workouts, workoutExercises, workoutSets];

const markPushed = () => {
  for (const table of TABLES) t.db.update(table).set({ dirty: false }).run();
};

const idsWhere = (
  pick: (row: { id: string; dirty: boolean; deletedAt: number | null }) => boolean,
) =>
  TABLES.flatMap((table) =>
    t.db.select({ id: table.id, dirty: table.dirty, deletedAt: table.deletedAt }).from(table).all(),
  )
    .filter(pick)
    .map((row) => row.id)
    .sort();

describe('SqliteWorkoutRepository: save and read', () => {
  it('round-trips a finished workout, bilateral and unilateral sets included (I-05)', async () => {
    await repository.save(FINISHED);

    expect(last<Workout | null>((o) => repository.observeById('w1', o))()).toEqual(FINISHED);
  });

  it('writes every row pending push; a guest writes user_id null', async () => {
    await repository.save(FINISHED);

    expect(idsWhere((row) => row.dirty)).toEqual(['s1', 's2', 's3', 'w1', 'we1', 'we2']);
    expect(
      t.db
        .select()
        .from(workoutSets)
        .all()
        .map((row) => row.userId),
    ).toEqual([null, null, null]);
  });

  it('a signed-in owner writes every row with their user_id', async () => {
    t.db.insert(appState).values({ owner: 'u1' }).run();

    await repository.save(FINISHED);

    const owners = TABLES.flatMap((table) =>
      t.db.select({ userId: table.userId }).from(table).all(),
    );
    expect(new Set(owners.map((row) => row.userId))).toEqual(new Set(['u1']));
  });

  it('logging a set marks pending push only the new set', async () => {
    await repository.save(IN_PROGRESS);
    markPushed();
    const [exercise] = IN_PROGRESS.exercises;

    await repository.save({
      ...IN_PROGRESS,
      exercises: [
        { ...exercise, sets: [aBilateralSet({ id: 's9', workoutExerciseId: 'we3', position: 1 })] },
      ],
    });

    expect(idsWhere((row) => row.dirty)).toEqual(['s9']);
  });

  it('a set taken out of the workout is deleted logically (RN-SYNC-15)', async () => {
    await repository.save(FINISHED);
    markPushed();
    now = T0 + 1_000;
    const [squat, row] = FINISHED.exercises;

    await repository.save({ ...FINISHED, exercises: [{ ...squat, sets: [squat.sets[0]] }, row] });

    expect(idsWhere((r) => r.deletedAt !== null)).toEqual(['s2']);
    expect(idsWhere((r) => r.dirty)).toEqual(['s2']);
    const read = last<Workout | null>((o) => repository.observeById('w1', o))();
    expect(read?.exercises[0].sets.map((set) => set.id)).toEqual(['s1']);
  });

  it('saves all or nothing: an invalid set leaves no row behind (CHECK)', async () => {
    const [squat] = FINISHED.exercises;
    const invalid: Workout = {
      ...FINISHED,
      exercises: [
        { ...squat, sets: [aBilateralSet({ id: 's1', workoutExerciseId: 'we1', reps: 101 })] },
      ],
    };

    const error = await repository.save(invalid).then(
      () => null,
      (reason: unknown) => reason,
    );

    expect(String(error)).toMatch(/CHECK constraint failed/);
    expect(t.db.select().from(workouts).all()).toEqual([]);
  });

  it('saving a deleted workout writes nothing (RN-SYNC-15)', async () => {
    await repository.save(FINISHED);
    await repository.delete('w1');
    markPushed();

    await repository.save({ ...FINISHED, notes: 'otra' });

    expect(idsWhere((row) => row.dirty)).toEqual([]);
  });
});

describe('SqliteWorkoutRepository: observation', () => {
  it('observeInProgress emits the workout in progress, or null (I-04)', async () => {
    const inProgress = last<Workout | null>((o) => repository.observeInProgress(o));
    expect(inProgress()).toBeNull();

    await repository.save(IN_PROGRESS);
    await repository.save(FINISHED);
    changes.emit('workouts');
    await flush();

    expect(inProgress()?.id).toBe('w2');
  });

  it('observeFinished emits only finished workouts, by finishedAt (RN-SUG-01)', async () => {
    const earlier = aWorkout({
      id: 'w0',
      startedAt: new Date('2026-10-01T11:00:00Z'),
      finishedAt: new Date('2026-10-01T12:00:00Z'),
    });
    await repository.save(FINISHED);
    await repository.save(IN_PROGRESS);
    await repository.save(earlier);

    expect(last<Workout[]>((o) => repository.observeFinished(o))().map((w) => w.id)).toEqual([
      'w0',
      'w1',
    ]);
  });

  it('re-reads after a change in the sets', async () => {
    await repository.save(FINISHED);
    const values: Workout[][] = [];
    repository.observeFinished({ next: (value) => values.push(value), error: jest.fn() });

    changes.emit('workout_sets');
    await flush();

    expect(values).toHaveLength(2);
  });
});

describe('SqliteWorkoutRepository: delete (06 §3, I-07)', () => {
  it('discarding deletes the workout, its exercises and their sets logically, pending push', async () => {
    await repository.save(FINISHED);
    markPushed();
    now = T0 + 5_000;

    await repository.delete('w1');

    expect(idsWhere((row) => row.deletedAt !== null)).toEqual([
      's1',
      's2',
      's3',
      'w1',
      'we1',
      'we2',
    ]);
    expect(idsWhere((row) => row.dirty)).toEqual(['s1', 's2', 's3', 'w1', 'we1', 'we2']);
    expect(last<Workout | null>((o) => repository.observeById('w1', o))()).toBeNull();
    expect(last<Workout[]>((o) => repository.observeFinished(o))()).toEqual([]);
  });

  it('never emits a live set of a deleted exercise (RN-SYNC-12)', async () => {
    await repository.save(FINISHED);
    t.db
      .update(workoutExercises)
      .set({ deletedAt: T0 })
      .where(eq(workoutExercises.id, 'we1'))
      .run();

    const read = last<Workout | null>((o) => repository.observeById('w1', o))();

    expect(read?.exercises.map((exercise) => exercise.id)).toEqual(['we2']);
  });
});
