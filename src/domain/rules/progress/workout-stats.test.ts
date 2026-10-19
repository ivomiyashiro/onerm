import type { WorkoutSet } from '@/domain/models/workout';
import type { LocalDate } from '@/domain/models/local-date';
import { totalLoadKg, weekProgress } from '@/domain/rules/progress/workout-stats';
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

describe('weekProgress (RF-ENT-01.AC8, RN-GEN-01)', () => {
  const localDate = (instant: Date) => instant.toISOString().slice(0, 10) as LocalDate;
  const finishedOn = (id: string, day: string) =>
    aWorkout({ id, finishedAt: new Date(`${day}T19:00:00Z`) });

  it('the days trained from Monday to today, today, and how many workouts', () => {
    // 2026-10-19 is a Monday; today is Wednesday 21. Two workouts on Monday count as two.
    const finished = [
      finishedOn('sunday-before', '2026-10-18'),
      finishedOn('monday', '2026-10-19'),
      finishedOn('monday-again', '2026-10-19'),
      finishedOn('wednesday', '2026-10-21'),
    ];

    expect(weekProgress(finished, '2026-10-21' as LocalDate, localDate)).toEqual({
      done: 3,
      doneDays: [0, 2],
      today: 2,
    });
  });

  it('on Sunday the week still starts on Monday; nothing done is an empty week', () => {
    // 2026-10-25 is the Sunday of the week of the 19th.
    const sunday = '2026-10-25' as LocalDate;

    expect(weekProgress([], sunday, localDate)).toEqual({ done: 0, doneDays: [], today: 6 });
    expect(weekProgress([finishedOn('sunday', '2026-10-25')], sunday, localDate)).toEqual({
      done: 1,
      doneDays: [6],
      today: 6,
    });
  });
});
