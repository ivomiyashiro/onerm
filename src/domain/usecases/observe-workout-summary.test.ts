import type { LocalDate } from '@/domain/models/local-date';
import type { Workout } from '@/domain/models/workout';
import { defaultProfile } from '@/domain/rules/routine/default-profile';
import {
  aBilateralSet,
  anExercise,
  aRoutine,
  aRoutineDay,
  aWorkout,
  aWorkoutExercise,
} from '@/domain/testing/builders';
import {
  InMemoryProfileRepository,
  InMemoryRoutineRepository,
  InMemoryWorkoutRepository,
} from '@/domain/testing/in-memory-repositories';
import {
  ObserveWorkoutSummary,
  type WorkoutSummary,
} from '@/domain/usecases/observe-workout-summary';

const localDate = (instant: Date) => instant.toISOString().slice(0, 10) as LocalDate;
const SQUAT = anExercise({ id: 'squat', name: 'Sentadilla' });
const CURL = anExercise({ id: 'curl', name: 'Curl' });
const ROUTINE = aRoutine({
  id: 'routine-1',
  days: [
    aRoutineDay({ id: 'day-1', name: 'Día A' }),
    aRoutineDay({ id: 'day-2', name: 'Día B', position: 1 }),
  ],
});

const sets = (rows: [number, number][], workoutExerciseId = 'we-1') =>
  rows.map(([loadKg, reps], position) =>
    aBilateralSet({
      id: `${workoutExerciseId}-s${position}`,
      workoutExerciseId,
      position,
      loadKg,
      reps,
      rir: 2,
    }),
  );

function workout(id: string, finishedAt: string, squat: [number, number][], extra = {}): Workout {
  return aWorkout({
    id,
    routineId: 'routine-1',
    routineDayId: 'day-1',
    startedAt: new Date(new Date(finishedAt).getTime() - 52 * 60_000),
    finishedAt: new Date(finishedAt),
    exercises: [
      aWorkoutExercise({
        id: 'we-1',
        workoutId: id,
        routineExerciseId: 're-1',
        exerciseId: 'squat',
        plannedExerciseId: 'squat',
        status: squat.length > 0 ? 'done' : 'skipped',
        sets: sets(squat),
      }),
      aWorkoutExercise({
        id: 'we-2',
        workoutId: id,
        routineExerciseId: 're-2',
        exerciseId: 'curl',
        plannedExerciseId: 'curl',
        position: 1,
        status: 'skipped',
      }),
    ],
    ...extra,
  });
}

function observe(finished: Workout[], id = finished.at(-1)!.id) {
  const values: (WorkoutSummary | null)[] = [];
  new ObserveWorkoutSummary(
    new InMemoryProfileRepository({ ...defaultProfile(), activeRoutineId: 'routine-1' }),
    new InMemoryRoutineRepository([ROUTINE]),
    new InMemoryWorkoutRepository(null, finished),
    { observeAll: (o) => (o.next([SQUAT, CURL]), () => {}) },
    () => new Date('2026-10-14T12:00:00Z'),
    localDate,
  ).execute(id, { next: (value) => values.push(value), error: jest.fn() });
  return values.at(-1);
}

describe('ObserveWorkoutSummary', () => {
  it('RF-ENT-11.AC1: duration, effective sets, exercises done and the next day', () => {
    const summary = observe([
      workout('w1', '2026-10-13T19:00:00Z', [
        [100, 8],
        [100, 7],
      ]),
    ])!;

    expect(summary).toMatchObject({
      dayName: 'Día A',
      minutes: 52,
      sets: 2,
      exercisesDone: 1,
      exercisesTotal: 2,
      nextDayName: 'Día B',
      unit: 'kg',
    });
    expect(summary.lines).toEqual([
      expect.objectContaining({
        name: 'Sentadilla',
        status: 'done',
        // #223: each effective set, for its chip.
        sets: [
          { loadKg: 100, reps: 8 },
          { loadKg: 100, reps: 7 },
        ],
        best: { loadKg: 100, reps: 8 },
      }),
      { name: 'Curl', status: 'skipped' },
    ]);
  });

  it('RF-ENT-11.AC6: the total load lifted, from its effective sets (RN-ENT-13)', () => {
    const summary = observe([
      workout('w1', '2026-10-13T19:00:00Z', [
        [100, 8],
        [100, 7],
      ]),
    ])!;

    expect(summary.totalLoadKg).toBe(1500);
  });

  it('RN-PROG-03: the first time an exercise is done is not a record', () => {
    expect(observe([workout('w1', '2026-10-13T19:00:00Z', [[100, 8]])])!.records).toEqual([]);
  });

  it('RF-PROG-05.AC2: a heavier load and a higher e1RM than before are highlighted', () => {
    const summary = observe([
      workout('w1', '2026-10-10T19:00:00Z', [[100, 8]]),
      workout('w2', '2026-10-13T19:00:00Z', [[105, 8]]),
    ])!;

    expect(summary.records).toEqual([
      { kind: 'heaviestLoad', name: 'Sentadilla', loadKg: 105, reps: 8 },
      {
        kind: 'e1rm',
        name: 'Sentadilla',
        e1rm: expect.objectContaining({ precision: 'standard' }),
      },
    ]);
  });

  it('a best set with the same load and fewer reps is no record', () => {
    expect(
      observe([
        workout('w1', '2026-10-10T19:00:00Z', [[100, 10]]),
        workout('w2', '2026-10-13T19:00:00Z', [[100, 8]]),
      ])!.records,
    ).toEqual([]);
  });

  it('a workout that is gone (discarded or deleted) is null', () => {
    expect(observe([workout('w1', '2026-10-13T19:00:00Z', [[100, 8]])], 'other')).toBeNull();
  });
});
