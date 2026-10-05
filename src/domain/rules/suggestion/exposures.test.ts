import type { WorkoutSet } from '@/domain/models/workout';
import {
  exerciseExposures,
  routineExposures,
  workingLoad,
  type Exposure,
} from '@/domain/rules/suggestion/exposures';
import {
  aBilateralSet,
  aPrescription,
  aUnilateralSet,
  aWorkout,
  aWorkoutExercise,
} from '@/domain/testing/builders';

const day = (n: number) => new Date(Date.UTC(2026, 9, n, 12));

function workout(
  id: string,
  finishedDay: number,
  exercises: Parameters<typeof aWorkoutExercise>[0][],
) {
  return aWorkout({
    id,
    startedAt: day(finishedDay),
    finishedAt: day(finishedDay),
    exercises: exercises.map((exercise, i) =>
      aWorkoutExercise({ id: `${id}-we-${i}`, workoutId: id, position: i, ...exercise }),
    ),
  });
}

const sets = (...loadsAndReps: [number, number][]): WorkoutSet[] =>
  loadsAndReps.map(([loadKg, reps], i) =>
    aBilateralSet({ id: `s${i}`, position: i, loadKg, reps }),
  );

describe('RN-SUG-01 · exercise exposures (EE)', () => {
  it('are the effective sets of the exercise in each finished workout, in any context', () => {
    const workouts = [
      workout('w1', 1, [{ exerciseId: 'squat', routineExerciseId: 're-a', sets: sets([60, 10]) }]),
      // As a substitute in another routine.
      workout('w2', 3, [
        {
          exerciseId: 'squat',
          routineExerciseId: 're-b',
          plannedExerciseId: 'leg-press',
          sets: sets([62.5, 8]),
        },
      ]),
      workout('w3', 5, [{ exerciseId: 'bench', sets: sets([40, 10]) }]),
    ];

    expect(exerciseExposures('squat', workouts).map((exposure) => exposure.workoutId)).toEqual([
      'w1',
      'w2',
    ]);
  });

  it('leave out workouts in progress', () => {
    const inProgress = aWorkout({
      status: 'in_progress',
      finishedAt: null,
      exercises: [aWorkoutExercise({ sets: sets([60, 10]) })],
    });

    expect(exerciseExposures('barbell-back-squat', [inProgress])).toEqual([]);
  });

  it('keep only effective sets: no warm-ups and at least 1 rep (I-11)', () => {
    const [exposure] = exerciseExposures('squat', [
      workout('w1', 1, [
        {
          exerciseId: 'squat',
          sets: [
            aBilateralSet({ id: 'warm', position: 0, loadKg: 20, reps: 10, isWarmup: true }),
            aBilateralSet({ id: 'zero', position: 1, loadKg: 60, reps: 0 }),
            aBilateralSet({ id: 'work', position: 2, loadKg: 60, reps: 8, rir: 2 }),
          ],
        },
      ]),
    ]);

    expect(exposure.sets).toEqual([{ loadKg: 60, reps: 8, rir: 2, side: null }]);
  });

  it('an exercise skipped or without effective sets is not an exposure (RN-ENT-09)', () => {
    const workouts = [
      workout('w1', 1, [{ exerciseId: 'squat', status: 'skipped', sets: [] }]),
      workout('w2', 2, [{ exerciseId: 'squat', sets: sets([60, 0]) }]),
    ];

    expect(exerciseExposures('squat', workouts)).toEqual([]);
  });

  it('a unilateral set counts by its limiting side (RN-ENT-06)', () => {
    const [exposure] = exerciseExposures('row', [
      workout('w1', 1, [
        {
          exerciseId: 'row',
          isUnilateral: true,
          sets: [aUnilateralSet({ loadKg: 20, repsLeft: 10, repsRight: 12, rirLeft: 1 })],
        },
      ]),
    ]);

    expect(exposure.sets).toEqual([{ loadKg: 20, reps: 10, rir: 1, side: 'left' }]);
  });

  it('are ordered by finishedAt, then by workout id', () => {
    const workouts = [
      workout('w3', 9, [{ exerciseId: 'squat', sets: sets([60, 10]) }]),
      workout('w2', 4, [{ exerciseId: 'squat', sets: sets([60, 10]) }]),
      workout('w1', 4, [{ exerciseId: 'squat', sets: sets([60, 10]) }]),
    ];

    expect(exerciseExposures('squat', workouts).map((exposure) => exposure.workoutId)).toEqual([
      'w1',
      'w2',
      'w3',
    ]);
  });

  it('keep the prescription copied in the workout (RN-ENT-08)', () => {
    const copy = aPrescription({ repRange: { min: 4, max: 6 } });
    const [exposure] = exerciseExposures('squat', [
      workout('w1', 1, [{ exerciseId: 'squat', prescription: copy, sets: sets([100, 6]) }]),
    ]);

    expect(exposure.prescription).toBe(copy);
  });
});

describe('RN-SUG-01 · routine exercise exposures (ERR)', () => {
  const current = { id: 're-a', exerciseId: 'squat' };

  it('belong to the routine exercise and use its current exercise', () => {
    const workouts = [
      // Before the routine exercise changed from leg press to squat (RN-RUT-08).
      workout('w1', 1, [
        { routineExerciseId: 're-a', exerciseId: 'leg-press', sets: sets([100, 10]) },
      ]),
      workout('w2', 2, [{ routineExerciseId: 're-a', exerciseId: 'squat', sets: sets([60, 10]) }]),
      // A substitute of the same routine exercise (RN-ENT-10).
      workout('w3', 3, [
        {
          routineExerciseId: 're-a',
          plannedExerciseId: 'squat',
          exerciseId: 'hack-squat',
          sets: sets([80, 10]),
        },
      ]),
      // The same exercise in another routine.
      workout('w4', 4, [{ routineExerciseId: 're-b', exerciseId: 'squat', sets: sets([60, 10]) }]),
    ];

    expect(routineExposures(current, workouts).map((exposure) => exposure.workoutId)).toEqual([
      'w2',
    ]);
  });
});

describe('RN-SUG-01 · working load W', () => {
  const exposure = (...loadsAndReps: [number, number][]): Exposure => ({
    workoutId: 'w1',
    exerciseId: 'squat',
    startedAt: day(1),
    finishedAt: day(1),
    prescription: aPrescription(),
    sets: loadsAndReps.map(([loadKg, reps]) => ({ loadKg, reps, rir: 2, side: null })),
  });

  it('caso I · is the most used load', () => {
    expect(workingLoad(exposure([60, 10], [60, 9], [55, 10]))).toBe(60);
  });

  it('caso E · on a tie, the highest', () => {
    expect(workingLoad(exposure([30, 12], [35, 11], [37.5, 9]))).toBe(37.5);
  });

  it('loads that differ by less than 0.05 kg are the same load (RN-GEN-02)', () => {
    expect(workingLoad(exposure([20.41, 10], [20.43, 10], [22.5, 8]))).toBe(20.43);
  });

  it('is null without load (bodyweight)', () => {
    expect(
      workingLoad({ ...exposure(), sets: [{ loadKg: null, reps: 12, rir: null, side: null }] }),
    ).toBeNull();
  });
});
