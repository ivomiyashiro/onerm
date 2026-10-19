import type { WorkoutSet } from '@/domain/models/workout';
import { totalLoadKg } from '@/domain/rules/progress/workout-stats';
import {
  aBilateralSet,
  aUnilateralSet,
  aWorkout,
  aWorkoutExercise,
} from '@/domain/testing/builders';

const workoutWith = (...sets: WorkoutSet[][]) =>
  aWorkout({ exercises: sets.map((s, i) => aWorkoutExercise({ id: `we-${i}`, sets: s })) });

describe('totalLoadKg (RN-ENT-13)', () => {
  it('adds load × reps of the effective sets of every exercise', () => {
    const workout = workoutWith(
      [
        aBilateralSet({ id: 'a', loadKg: 100, reps: 5 }),
        aBilateralSet({ id: 'b', loadKg: 90, reps: 8 }),
      ],
      [aBilateralSet({ id: 'c', loadKg: 20, reps: 10 })],
    );

    expect(totalLoadKg(workout)).toBe(100 * 5 + 90 * 8 + 20 * 10);
  });

  it('a unilateral set adds both sides', () => {
    const workout = workoutWith([aUnilateralSet({ loadKg: 16, repsLeft: 10, repsRight: 9 })]);

    expect(totalLoadKg(workout)).toBe(16 * 19);
  });

  it('warm-ups (RN-ENT-12) and bodyweight sets add nothing', () => {
    const workout = workoutWith([
      aBilateralSet({ id: 'w', loadKg: 60, reps: 10, isWarmup: true }),
      aBilateralSet({ id: 'bw', loadKg: null, reps: 12 }),
      aBilateralSet({ id: 'x', loadKg: 80, reps: 6 }),
    ]);

    expect(totalLoadKg(workout)).toBe(80 * 6);
  });

  it('only bodyweight: there is no total load', () => {
    const workout = workoutWith([aBilateralSet({ loadKg: null, reps: 12 })]);

    expect(totalLoadKg(workout)).toBeNull();
  });
});
