import {
  aBilateralSet,
  aUnilateralSet,
  aWorkout,
  aWorkoutExercise,
} from '@/domain/testing/builders';
import { InMemoryWorkoutRepository } from '@/domain/testing/in-memory-repositories';
import { DeleteSet, LogSet, RestoreSet, UpdateSet } from '@/domain/usecases/workout-sets';

const NOW = new Date('2026-10-13T18:10:00Z');
const SQUAT = aWorkoutExercise({ id: 'we-1' });
const ROW = aWorkoutExercise({
  id: 'we-2',
  exerciseId: 'one-arm-row',
  position: 1,
  isUnilateral: true,
});

function setUp(exercises = [SQUAT, ROW]) {
  let n = 0;
  const workouts = new InMemoryWorkoutRepository(
    aWorkout({ status: 'in_progress', finishedAt: null, exercises }),
  );
  const newId = () => `set-${++n}`;
  return {
    workouts,
    exercise: (id: string) => workouts.inProgress!.exercises.find((e) => e.id === id)!,
    logSet: new LogSet(workouts, newId, () => NOW),
    updateSet: new UpdateSet(workouts),
    deleteSet: new DeleteSet(workouts),
    restoreSet: new RestoreSet(workouts, newId),
  };
}

const BILATERAL = { isUnilateral: false, loadKg: 60, reps: 8, rir: null, isWarmup: false } as const;

describe('LogSet', () => {
  it('RF-ENT-02.AC1, AC6: saves the set and the exercise is done', async () => {
    const { logSet, exercise } = setUp();

    const result = await logSet.execute('we-1', BILATERAL);

    expect(result.status).toBe('saved');
    expect(exercise('we-1')).toMatchObject({
      status: 'done',
      sets: [{ id: 'set-1', position: 0, completedAt: NOW, ...BILATERAL }],
    });
  });

  it('RF-ENT-02.AC5: a value out of RN-ENT-02 is not saved', async () => {
    const { logSet, exercise } = setUp();

    const result = await logSet.execute('we-1', { ...BILATERAL, reps: 101 });

    expect(result).toEqual({
      status: 'invalid',
      violations: [{ code: 'set.reps', path: ['reps'] }],
    });
    expect(exercise('we-1').sets).toEqual([]);
  });

  it('RF-ENT-03.AC2: a unilateral set keeps the reps of each side', async () => {
    const { logSet, exercise } = setUp();

    await logSet.execute('we-2', {
      isUnilateral: true,
      loadKg: 20,
      repsLeft: 8,
      repsRight: 10,
      rirLeft: null,
      rirRight: null,
      isWarmup: false,
    });

    expect(exercise('we-2').sets[0]).toMatchObject({ repsLeft: 8, repsRight: 10 });
  });

  it('RF-ENT-14.AC1: a warm-up set is saved but the exercise is not done yet', async () => {
    const { logSet, exercise } = setUp();

    await logSet.execute('we-1', { ...BILATERAL, loadKg: 30, isWarmup: true });

    expect(exercise('we-1')).toMatchObject({ status: 'pending', sets: [{ isWarmup: true }] });
  });

  it('the next set goes after the last one', async () => {
    const { logSet, exercise } = setUp([
      { ...SQUAT, sets: [aBilateralSet({ id: 'old', workoutExerciseId: 'we-1', position: 4 })] },
    ]);

    await logSet.execute('we-1', BILATERAL);

    expect(exercise('we-1').sets.map((s) => s.position)).toEqual([4, 5]);
  });
});

describe('UpdateSet', () => {
  it('RF-ENT-04.AC1, RF-ENT-02.AC4: corrects the reps and the effort of a set', async () => {
    const set = aBilateralSet({ id: 's', workoutExerciseId: 'we-1', reps: 8, rir: null });
    const { updateSet, exercise } = setUp([{ ...SQUAT, status: 'done', sets: [set] }]);

    await updateSet.execute('s', { ...BILATERAL, reps: 7, rir: 1 });

    expect(exercise('we-1').sets).toEqual([{ ...set, reps: 7, rir: 1, loadKg: 60 }]);
  });

  it('RF-ENT-14.AC3: marking it as a warm-up stops it from counting', async () => {
    const set = aBilateralSet({ id: 's', workoutExerciseId: 'we-1' });
    const { updateSet, exercise } = setUp([{ ...SQUAT, status: 'done', sets: [set] }]);

    await updateSet.execute('s', { ...BILATERAL, isWarmup: true });

    expect(exercise('we-1').status).toBe('pending');
  });
});

describe('DeleteSet and RestoreSet', () => {
  it('RF-ENT-04.AC2: the set leaves the workout and undo brings it back in place', async () => {
    const first = aUnilateralSet({ id: 'a', workoutExerciseId: 'we-2', position: 0 });
    const second = aUnilateralSet({ id: 'b', workoutExerciseId: 'we-2', position: 1 });
    const { deleteSet, restoreSet, exercise } = setUp([
      SQUAT,
      { ...ROW, status: 'done', sets: [first, second] },
    ]);

    const deleted = await deleteSet.execute('a');
    expect(exercise('we-2').sets).toEqual([second]);

    await restoreSet.execute(deleted!);
    // A new id: the deleted row is a tombstone that never comes back (RN-SYNC-15).
    expect(exercise('we-2').sets).toEqual([{ ...first, id: 'set-1' }, second]);
  });
});
