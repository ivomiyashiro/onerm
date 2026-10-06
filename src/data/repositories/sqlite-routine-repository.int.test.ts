import { eq } from 'drizzle-orm';

import { openTestDatabase, type TestDatabase } from '@/data/db/open-test-database';
import { appState, routineDays, routineExercises, routines } from '@/data/db/schema';
import { ManualTableChanges } from '@/data/db/table-changes';
import { SqliteRoutineRepository } from '@/data/repositories/sqlite-routine-repository';
import type { Routine } from '@/domain/models/routine';
import { aPrescription, aRoutine, aRoutineDay, aRoutineExercise } from '@/domain/testing/builders';

const T0 = 1_780_000_000_000;
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/** A routine with two days: A (squat, bench) and B (row). */
const ROUTINE: Routine = aRoutine({
  id: 'r1',
  name: 'Full body',
  sourceTemplateId: 'PLT-FB3',
  days: [
    aRoutineDay({
      id: 'd1',
      routineId: 'r1',
      name: 'A',
      position: 1,
      exercises: [
        aRoutineExercise({ id: 'e1', routineDayId: 'd1', exerciseId: 'squat', position: 1 }),
        aRoutineExercise({
          id: 'e2',
          routineDayId: 'd1',
          exerciseId: 'bench',
          position: 2,
          prescription: aPrescription({
            role: 'accessory',
            sets: 2,
            repRange: { min: 10, max: 15 },
          }),
          notes: 'Agarre cerrado',
        }),
      ],
    }),
    aRoutineDay({
      id: 'd2',
      routineId: 'r1',
      name: 'B',
      position: 2,
      exercises: [
        aRoutineExercise({ id: 'e3', routineDayId: 'd2', exerciseId: 'row', position: 1 }),
      ],
    }),
  ],
});

let t: TestDatabase;
let changes: ManualTableChanges;
let now: number;
let repository: SqliteRoutineRepository;

beforeEach(() => {
  t = openTestDatabase();
  changes = new ManualTableChanges();
  now = T0;
  repository = new SqliteRoutineRepository(
    () => t.db,
    changes,
    () => now,
  );
});

afterEach(() => {
  t.sqlite.close();
});

function observeAll() {
  const values: Routine[][] = [];
  const error = jest.fn();
  repository.observeAll({ next: (value) => values.push(value), error });
  return { last: () => values[values.length - 1], count: () => values.length, error };
}

function observeById(id: string) {
  const values: (Routine | null)[] = [];
  repository.observeById(id, { next: (value) => values.push(value), error: jest.fn() });
  return () => values[values.length - 1];
}

const markPushed = () => {
  for (const table of [routines, routineDays, routineExercises]) {
    t.db.update(table).set({ dirty: false }).run();
  }
};

const dirtyIds = () =>
  [routines, routineDays, routineExercises]
    .flatMap((table) =>
      t.db.select({ id: table.id }).from(table).where(eq(table.dirty, true)).all(),
    )
    .map((row) => row.id)
    .sort();

const deletedIds = () =>
  [routines, routineDays, routineExercises]
    .flatMap((table) => t.db.select({ id: table.id, deletedAt: table.deletedAt }).from(table).all())
    .filter((row) => row.deletedAt !== null)
    .map((row) => row.id)
    .sort();

describe('SqliteRoutineRepository: save and read', () => {
  it('emits no routines before any is saved', () => {
    expect(observeAll().last()).toEqual([]);
  });

  it('saves the aggregate and reads it back the same, days and exercises in order (I-10)', async () => {
    const { last } = observeAll();

    await repository.save(ROUTINE);
    changes.emit('routines');
    await flush();

    expect(last()).toEqual([ROUTINE]);
  });

  it('writes routine, days and exercises pending push, as a guest (user_id null)', async () => {
    await repository.save(ROUTINE);

    expect(dirtyIds()).toEqual(['d1', 'd2', 'e1', 'e2', 'e3', 'r1']);
    expect(
      t.db
        .select()
        .from(routineExercises)
        .all()
        .map((row) => row.userId),
    ).toEqual([null, null, null]);
  });

  it('a signed-in owner writes every row with their user_id', async () => {
    t.db.insert(appState).values({ owner: 'u1' }).run();

    await repository.save(ROUTINE);

    const owners = [routines, routineDays, routineExercises].flatMap((table) =>
      t.db.select({ userId: table.userId }).from(table).all(),
    );
    expect(new Set(owners.map((row) => row.userId))).toEqual(new Set(['u1']));
  });

  it('an edit marks pending push only the rows that changed', async () => {
    await repository.save(ROUTINE);
    markPushed();
    now = T0 + 1_000;

    const [dayA, dayB] = ROUTINE.days;
    await repository.save({
      ...ROUTINE,
      days: [
        { ...dayA, exercises: [dayA.exercises[0], { ...dayA.exercises[1], notes: null }] },
        dayB,
      ],
    });

    expect(dirtyIds()).toEqual(['e2']);
    expect(
      t.db.select().from(routineExercises).where(eq(routineExercises.id, 'e2')).get(),
    ).toMatchObject({
      notes: null,
      updatedAt: T0 + 1_000,
    });
  });

  it('an exercise or a day taken out of the aggregate is deleted logically, with its exercises', async () => {
    await repository.save(ROUTINE);
    markPushed();
    now = T0 + 1_000;
    const [dayA] = ROUTINE.days;

    await repository.save({ ...ROUTINE, days: [{ ...dayA, exercises: [dayA.exercises[0]] }] });

    expect(deletedIds()).toEqual(['d2', 'e2', 'e3']);
    expect(dirtyIds()).toEqual(['d2', 'e2', 'e3']);
    expect(observeById('r1')()?.days.map((day) => day.id)).toEqual(['d1']);
  });

  it('moving an exercise to another day updates its day', async () => {
    await repository.save(ROUTINE);
    const [dayA, dayB] = ROUTINE.days;
    const moved = { ...dayB.exercises[0], routineDayId: 'd1', position: 3 };

    await repository.save({
      ...ROUTINE,
      days: [
        { ...dayA, exercises: [...dayA.exercises, moved] },
        { ...dayB, exercises: [] },
      ],
    });

    const read = observeById('r1')();
    expect(read?.days[0].exercises.map((exercise) => exercise.id)).toEqual(['e1', 'e2', 'e3']);
    expect(read?.days[1].exercises).toEqual([]);
    expect(deletedIds()).toEqual([]);
  });

  it('saves all or nothing: an invalid prescription leaves no row behind (I-03 CHECK)', async () => {
    const [dayA] = ROUTINE.days;
    const invalid: Routine = {
      ...ROUTINE,
      days: [
        {
          ...dayA,
          exercises: [
            ...dayA.exercises,
            aRoutineExercise({
              id: 'e9',
              routineDayId: 'd1',
              position: 3,
              prescription: aPrescription({ sets: 11 }),
            }),
          ],
        },
      ],
    };

    const error = await repository.save(invalid).then(
      () => null,
      (reason: unknown) => reason,
    );

    expect(String(error)).toMatch(/CHECK constraint failed/);
    expect(t.db.select().from(routines).all()).toEqual([]);
    expect(t.db.select().from(routineDays).all()).toEqual([]);
  });

  it('does not revive a deleted routine (RN-SYNC-15)', async () => {
    await repository.save(ROUTINE);
    await repository.delete('r1');

    await repository.save({ ...ROUTINE, name: 'Otra' });

    expect(observeById('r1')()).toBeNull();
    expect(t.db.select().from(routines).get()).toMatchObject({ name: 'Full body' });
  });
});

describe('SqliteRoutineRepository: delete (I-07, RN-SYNC-15)', () => {
  it('a new exercise under a deleted day is not written (RN-SYNC-12, RN-SYNC-15)', async () => {
    await repository.save(ROUTINE);
    // A tombstone pulled for day A (F6).
    t.db.update(routineDays).set({ deletedAt: T0 }).where(eq(routineDays.id, 'd1')).run();
    markPushed();
    const [dayA, dayB] = ROUTINE.days;

    await repository.save({
      ...ROUTINE,
      days: [
        {
          ...dayA,
          exercises: [
            ...dayA.exercises,
            aRoutineExercise({ id: 'e9', routineDayId: 'd1', position: 3 }),
          ],
        },
        dayB,
      ],
    });

    expect(
      t.db.select().from(routineExercises).where(eq(routineExercises.id, 'e9')).get(),
    ).toBeUndefined();
    expect(dirtyIds()).toEqual([]);
  });

  it('saving a deleted routine writes nothing, not even new days or exercises', async () => {
    await repository.save(ROUTINE);
    await repository.delete('r1');
    markPushed();

    await repository.save({
      ...ROUTINE,
      days: [
        ...ROUTINE.days,
        aRoutineDay({ id: 'd9', routineId: 'r1', position: 3, exercises: [] }),
      ],
    });

    expect(t.db.select().from(routineDays).where(eq(routineDays.id, 'd9')).get()).toBeUndefined();
    expect(dirtyIds()).toEqual([]);
  });

  it('deletes the routine, its days and their exercises logically, pending push', async () => {
    await repository.save(ROUTINE);
    markPushed();
    now = T0 + 5_000;

    await repository.delete('r1');

    expect(deletedIds()).toEqual(['d1', 'd2', 'e1', 'e2', 'e3', 'r1']);
    expect(dirtyIds()).toEqual(['d1', 'd2', 'e1', 'e2', 'e3', 'r1']);
    expect(t.db.select().from(routines).get()?.updatedAt).toBe(T0 + 5_000);
  });

  it('observeById emits null for a deleted routine (RN-RUT-02) and observeAll leaves it out', async () => {
    await repository.save(ROUTINE);
    await repository.save({ ...ROUTINE, id: 'r2', days: [] });

    await repository.delete('r1');

    expect(observeById('r1')()).toBeNull();
    expect(
      observeAll()
        .last()
        .map((routine) => routine.id),
    ).toEqual(['r2']);
  });

  it('never emits a live child of a deleted parent (RN-SYNC-12)', async () => {
    await repository.save(ROUTINE);
    // A tombstone pulled for the day while its exercises are still live locally.
    t.db.update(routineDays).set({ deletedAt: T0 }).where(eq(routineDays.id, 'd1')).run();

    expect(observeById('r1')()?.days.map((day) => day.id)).toEqual(['d2']);
  });

  it('deleting a missing routine does nothing', async () => {
    await expect(repository.delete('missing')).resolves.toBeUndefined();
  });
});

describe('SqliteRoutineRepository: observation', () => {
  it('re-reads after a change in any of its tables', async () => {
    await repository.save(ROUTINE);
    const { count } = observeAll();

    changes.emit('routine_exercises');
    await flush();

    expect(count()).toBe(2);
  });

  it('observeById emits null for a routine that never existed', () => {
    expect(observeById('missing')()).toBeNull();
  });
});
