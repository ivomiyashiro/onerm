import { lastLoadKg } from '@/domain/rules/workout/last-load';
import { aBilateralSet, aWorkout, aWorkoutExercise } from '@/domain/testing/builders';

const workoutWith = (id: string, startedAt: string, exerciseId: string, loads: (number | null)[]) =>
  aWorkout({
    id,
    startedAt: new Date(startedAt),
    exercises: [
      aWorkoutExercise({
        id: `${id}-we`,
        exerciseId,
        sets: loads.map((loadKg, position) =>
          aBilateralSet({
            id: `${id}-${position}`,
            workoutExerciseId: `${id}-we`,
            position,
            loadKg,
          }),
        ),
      }),
    ],
  });

describe('lastLoadKg (#195)', () => {
  it('the last load logged in the workout in progress', () => {
    const today = workoutWith('today', '2026-10-17T18:00:00Z', 'press', [60, 62.5]);
    const before = workoutWith('before', '2026-10-15T18:00:00Z', 'press', [70]);

    expect(lastLoadKg('press', today, [before])).toBe(62.5);
  });

  it('without sets today, the last one of the most recent workout with that exercise', () => {
    const today = workoutWith('today', '2026-10-17T18:00:00Z', 'squat', [100]);
    const older = workoutWith('older', '2026-10-10T18:00:00Z', 'press', [55]);
    const newer = workoutWith('newer', '2026-10-15T18:00:00Z', 'press', [57.5, 60]);

    expect(lastLoadKg('press', today, [newer, older])).toBe(60);
  });

  it('a warm-up is not the last load', () => {
    const today = aWorkout({
      exercises: [
        aWorkoutExercise({
          id: 'we',
          exerciseId: 'press',
          sets: [aBilateralSet({ workoutExerciseId: 'we', loadKg: 40, isWarmup: true })],
        }),
      ],
    });
    const before = workoutWith('before', '2026-10-15T18:00:00Z', 'press', [60]);

    expect(lastLoadKg('press', today, [before])).toBe(60);
  });

  it('nothing without history, or with only sets without a load', () => {
    const today = workoutWith('today', '2026-10-17T18:00:00Z', 'press', [null]);

    expect(lastLoadKg('press', today, [])).toBeNull();
  });
});
