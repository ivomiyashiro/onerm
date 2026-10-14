import type { LocalDate } from '@/domain/models/local-date';
import { defaultProfile } from '@/domain/rules/routine/default-profile';
import { aBilateralSet, anExercise, aWorkout, aWorkoutExercise } from '@/domain/testing/builders';
import {
  InMemoryProfileRepository,
  InMemoryWorkoutRepository,
} from '@/domain/testing/in-memory-repositories';
import {
  ObserveExerciseProgress,
  type ExerciseProgressView,
} from '@/domain/usecases/observe-exercise-progress';

const localDate = (instant: Date) => instant.toISOString().slice(0, 10) as LocalDate;
const PRESS = anExercise({ id: 'press', name: 'Press de pecho' });

/** A workout on `date` with one set of the press, in another routine on odd days. */
const on = (date: string, loadKg: number, reps: number) =>
  aWorkout({
    id: date,
    routineId: Number(date.slice(-2)) % 2 ? 'other-routine' : 'routine-1',
    startedAt: new Date(`${date}T11:00:00Z`),
    finishedAt: new Date(`${date}T12:00:00Z`),
    exercises: [
      aWorkoutExercise({
        id: `${date}-we`,
        workoutId: date,
        exerciseId: 'press',
        plannedExerciseId: 'press',
        status: 'done',
        sets: [aBilateralSet({ id: `${date}-s`, loadKg, reps, rir: 2 })],
      }),
    ],
  });

const HISTORY = [on('2026-06-01', 60, 8), on('2026-09-20', 62.5, 8), on('2026-10-10', 65, 6)];

function observe(
  period: 'fourWeeks' | 'threeMonths' | 'all',
  finished = HISTORY,
  exerciseId = 'press',
) {
  let view: ExerciseProgressView | null | undefined;
  new ObserveExerciseProgress(
    new InMemoryProfileRepository(defaultProfile()),
    new InMemoryWorkoutRepository(null, finished),
    { observeAll: (o) => (o.next([PRESS]), () => {}) },
    () => new Date('2026-10-14T12:00:00Z'),
    localDate,
  ).execute(exerciseId, period, { next: (value) => (view = value), error: jest.fn() });
  return view;
}

describe('ObserveExerciseProgress', () => {
  it('RN-PROG-01, RF-PROG-04.AC1: one point per EE in any routine, with its e1RM', () => {
    const view = observe('all')!;

    expect(view).toMatchObject({ name: 'Press de pecho', isBodyweight: false, unit: 'kg' });
    expect(view.points.map((p) => p.workoutId)).toEqual(['2026-06-01', '2026-09-20', '2026-10-10']);
    expect(view.points[0].e1rm).toMatchObject({ precision: 'standard' });
  });

  it('RF-PROG-04.AC3: the chart keeps to the period; records and «última vez» do not', () => {
    const view = observe('fourWeeks')!;

    expect(view.points.map((p) => p.workoutId)).toEqual(['2026-09-20', '2026-10-10']);
    expect(view.records.heaviestLoad).toMatchObject({ loadKg: 65, reps: 6 });
    expect(view.last?.workoutId).toBe('2026-10-10');
    expect(observe('threeMonths')!.points).toHaveLength(2);
  });

  it('RF-PROG-04.AC2: the best set of each exposure', () => {
    expect(observe('all')!.points.map((p) => p.bestSet)).toEqual([
      { loadKg: 60, reps: 8 },
      { loadKg: 62.5, reps: 8 },
      { loadKg: 65, reps: 6 },
    ]);
  });

  it('null without any exposure of the exercise', () => {
    expect(observe('all', HISTORY, 'curl')).toBeNull();
  });
});
