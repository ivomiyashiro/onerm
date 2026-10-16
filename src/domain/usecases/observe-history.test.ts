import { aBilateralSet, aWorkout, aWorkoutExercise } from '@/domain/testing/builders';
import {
  FixedSyncStateRepository,
  InMemoryWorkoutRepository,
} from '@/domain/testing/in-memory-repositories';
import { ObserveHistory, type HistoryItem } from '@/domain/usecases/observe-history';

const finished = (id: string, day: number, loadKg: number) =>
  aWorkout({
    id,
    routineNameSnapshot: 'Cuerpo completo A/B',
    dayNameSnapshot: day % 2 ? 'Día A' : 'Día B',
    startedAt: new Date(Date.UTC(2026, 8, day, 11)),
    finishedAt: new Date(Date.UTC(2026, 8, day, 11, 52)),
    exercises: [
      aWorkoutExercise({
        id: `${id}-we`,
        workoutId: id,
        status: 'done',
        sets: [
          aBilateralSet({ id: `${id}-1`, loadKg, reps: 8 }),
          aBilateralSet({ id: `${id}-2`, loadKg, reps: 8, isWarmup: true }),
        ],
      }),
    ],
  });

function observe(inProgress = null as ReturnType<typeof aWorkout> | null) {
  const workouts = new InMemoryWorkoutRepository(inProgress, [
    finished('w23', 23, 100),
    finished('w25', 25, 105),
  ]);
  const syncState = new FixedSyncStateRepository();
  let items: HistoryItem[] = [];
  new ObserveHistory(workouts, syncState).execute({
    next: (value) => (items = value),
    error: jest.fn(),
  });
  return { items: () => items, workouts, syncState };
}

describe('ObserveHistory', () => {
  it('RF-PROG-01.AC1: newest first, with day, routine, duration, effective sets and records', () => {
    expect(observe().items()).toEqual([
      {
        id: 'w25',
        finishedAt: new Date(Date.UTC(2026, 8, 25, 11, 52)),
        dayName: 'Día A',
        routineName: 'Cuerpo completo A/B',
        minutes: 52,
        sets: 1,
        // A heavier load and a higher e1RM than on the 23rd (RN-PROG-03).
        records: 2,
        pending: false,
      },
      expect.objectContaining({ id: 'w23', records: 0 }),
    ]);
  });

  it('RF-PROG-01.AC1: the workout in progress is not in the history', () => {
    const running = aWorkout({ id: 'now', status: 'in_progress', finishedAt: null });

    expect(
      observe(running)
        .items()
        .map((item) => item.id),
    ).toEqual(['w25', 'w23']);
  });

  it('RF-PROG-01.AC3: empty without finished workouts', () => {
    let items: HistoryItem[] | null = null;
    new ObserveHistory(new InMemoryWorkoutRepository(), new FixedSyncStateRepository()).execute({
      next: (value) => (items = value),
      error: jest.fn(),
    });

    expect(items).toEqual([]);
  });

  it('RF-PROG-01.AC2: a workout not backed up yet is pending, until it is', () => {
    const { items, syncState } = observe();

    syncState.setPendingWorkouts(['w23']);
    expect(items().map((item) => [item.id, item.pending])).toEqual([
      ['w25', false],
      ['w23', true],
    ]);

    syncState.setPendingWorkouts([]);
    expect(items().every((item) => !item.pending)).toBe(true);
  });
});
