import type { LocalDate } from '@/domain/models/local-date';
import type { WorkoutSet } from '@/domain/models/workout';
import { weeklyVolume } from '@/domain/rules/progress/weekly-volume';
import {
  aBilateralSet,
  anExercise,
  aUnilateralSet,
  aWorkout,
  aWorkoutExercise,
} from '@/domain/testing/builders';

const localDate = (instant: Date) => instant.toISOString().slice(0, 10) as LocalDate;
const on = (date: string) => new Date(`${date}T15:00:00Z`);
const effective = (n: number): WorkoutSet[] =>
  Array.from({ length: n }, (_, i) => aBilateralSet({ id: `s${i}`, position: i }));

const exercises = new Map([
  [
    'bench',
    anExercise({
      id: 'bench',
      primaryMuscles: ['chest'],
      secondaryMuscles: ['triceps', 'shoulders'],
    }),
  ],
  ['row', anExercise({ id: 'row', primaryMuscles: ['back'], secondaryMuscles: ['biceps'] })],
]);

function workoutOn(date: string, ...items: [string, WorkoutSet[]][]) {
  return aWorkout({
    id: date,
    startedAt: on(date),
    finishedAt: on(date),
    exercises: items.map(([exerciseId, sets], i) =>
      aWorkoutExercise({ id: `${date}-${i}`, exerciseId, sets }),
    ),
  });
}

describe('RN-PROG-04 · weekly volume', () => {
  it('each effective set adds 1 to each primary muscle and 0.5 to each secondary (P-03)', () => {
    const volume = weeklyVolume(
      [workoutOn('2026-10-06', ['bench', effective(3)])],
      exercises,
      '2026-10-05',
      localDate,
    );

    expect(volume.chest).toBe(3);
    expect(volume.triceps).toBe(1.5);
    expect(volume.shoulders).toBe(1.5);
    expect(volume.quads).toBe(0);
  });

  it('only the week from Monday to Sunday counts', () => {
    const workouts = [
      workoutOn('2026-10-04', ['bench', effective(3)]), // Sunday before
      workoutOn('2026-10-05', ['bench', effective(2)]), // Monday
      workoutOn('2026-10-11', ['row', effective(2)]), // Sunday
      workoutOn('2026-10-12', ['row', effective(5)]), // next Monday
    ];

    const volume = weeklyVolume(workouts, exercises, '2026-10-05', localDate);

    expect(volume.chest).toBe(2);
    expect(volume.back).toBe(2);
  });

  it('warm-ups and sets with 0 reps do not count (RN-ENT-12)', () => {
    const sets = [
      aBilateralSet({ id: 'w', isWarmup: true }),
      aBilateralSet({ id: 'z', reps: 0 }),
      aBilateralSet({ id: 'e' }),
    ];

    expect(
      weeklyVolume([workoutOn('2026-10-06', ['bench', sets])], exercises, '2026-10-05', localDate)
        .chest,
    ).toBe(1);
  });

  it('a unilateral set counts as 1 set (ADR-0008)', () => {
    const volume = weeklyVolume(
      [workoutOn('2026-10-06', ['row', [aUnilateralSet()]])],
      exercises,
      '2026-10-05',
      localDate,
    );

    expect(volume.back).toBe(1);
  });

  it('workouts in progress do not count', () => {
    const inProgress = {
      ...workoutOn('2026-10-06', ['bench', effective(3)]),
      status: 'in_progress' as const,
      finishedAt: null,
    };

    expect(weeklyVolume([inProgress], exercises, '2026-10-05', localDate).chest).toBe(0);
  });

  it('an exercise not yet in the local catalog adds nothing (RN-CAT-04)', () => {
    expect(
      Object.values(
        weeklyVolume(
          [workoutOn('2026-10-06', ['unknown', effective(3)])],
          exercises,
          '2026-10-05',
          localDate,
        ),
      ).every((value) => value === 0),
    ).toBe(true);
  });
});
