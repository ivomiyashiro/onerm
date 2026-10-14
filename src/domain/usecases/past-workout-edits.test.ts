import type { LocalDate } from '@/domain/models/local-date';
import { defaultProfile } from '@/domain/rules/routine/default-profile';
import {
  aBilateralSet,
  anExercise,
  aRoutine,
  aWorkout,
  aWorkoutExercise,
} from '@/domain/testing/builders';
import {
  InMemoryProfileRepository,
  InMemoryRoutineRepository,
  InMemoryWorkoutRepository,
} from '@/domain/testing/in-memory-repositories';
import { ObserveNextDay, type NextDayOverview } from '@/domain/usecases/observe-next-day';
import {
  AddPastSet,
  DeletePastSet,
  DeleteWorkout,
  UpdatePastSet,
} from '@/domain/usecases/past-workout-edits';

const FINISHED_AT = new Date('2026-09-30T12:52:00Z');
const PAST = aWorkout({
  id: 'w1',
  finishedAt: FINISHED_AT,
  exercises: [
    aWorkoutExercise({
      id: 'we-1',
      workoutId: 'w1',
      status: 'done',
      sets: [aBilateralSet({ id: 's1', workoutExerciseId: 'we-1', loadKg: 60, reps: 8 })],
    }),
    aWorkoutExercise({ id: 'we-2', workoutId: 'w1', position: 1, status: 'skipped' }),
  ],
});
const SET = { isUnilateral: false, loadKg: 62.5, reps: 8, rir: 1, isWarmup: false } as const;

function setUp() {
  const workouts = new InMemoryWorkoutRepository(null, [PAST]);
  const exercise = (id: string) => workouts.finished[0].exercises.find((e) => e.id === id)!;
  return { workouts, exercise };
}

describe('past workout edits (RF-PROG-03)', () => {
  it('AC1: a set is corrected and keeps its place and time', async () => {
    const { workouts, exercise } = setUp();

    const result = await new UpdatePastSet(workouts).execute('w1', 's1', SET);

    expect(result.status).toBe('saved');
    expect(exercise('we-1').sets).toEqual([{ ...PAST.exercises[0].sets[0], ...SET }]);
  });

  it('AC6: a value out of RN-ENT-02 is not saved', async () => {
    const { workouts, exercise } = setUp();

    const result = await new UpdatePastSet(workouts).execute('w1', 's1', { ...SET, reps: 101 });

    expect(result.status).toBe('invalid');
    expect(exercise('we-1').sets[0]).toMatchObject({ reps: 8 });
  });

  it('AC3, RN-ENT-09: a forgotten set is added at the end; a skipped exercise becomes done', async () => {
    const { workouts, exercise } = setUp();

    await new AddPastSet(workouts, () => 'new').execute('w1', 'we-2', SET);

    expect(exercise('we-2')).toMatchObject({
      status: 'done',
      sets: [{ id: 'new', position: 0, completedAt: FINISHED_AT, ...SET }],
    });
  });

  it('AC2, RN-ENT-09: without effective sets left the exercise is skipped', async () => {
    const { workouts, exercise } = setUp();

    await new DeletePastSet(workouts).execute('w1', 's1');

    expect(exercise('we-1')).toMatchObject({ status: 'skipped', sets: [] });
  });

  it('AC4: the workout leaves the history', async () => {
    const { workouts } = setUp();

    await new DeleteWorkout(workouts).execute('w1');

    expect(workouts.finished).toEqual([]);
  });

  it('a workout that is gone reports missing', async () => {
    const { workouts } = setUp();

    expect(await new UpdatePastSet(workouts).execute('other', 's1', SET)).toEqual({
      status: 'missing',
    });
  });
});

it('«Listo cuando», AC5: a correction shows at once in the next suggestion (RN-SYNC-10)', async () => {
  // 3 × 12 at the cap of 8–12: the next time goes up (RN-SUG-03).
  const atCap = aWorkout({
    id: 'w1',
    exercises: [
      aWorkoutExercise({
        id: 'we-1',
        workoutId: 'w1',
        status: 'done',
        sets: [0, 1, 2].map((position) =>
          aBilateralSet({ id: `s${position}`, position, loadKg: 100, reps: 12, rir: 2 }),
        ),
      }),
    ],
  });
  const workouts = new InMemoryWorkoutRepository(null, [atCap]);
  let overview: NextDayOverview | null = null;
  new ObserveNextDay(
    new InMemoryProfileRepository({ ...defaultProfile(), activeRoutineId: 'routine-1' }),
    new InMemoryRoutineRepository([aRoutine()]),
    workouts,
    { observeAll: (o) => (o.next([anExercise()]), () => {}) },
    () => new Date('2026-10-14T12:00:00Z'),
    (instant: Date) => instant.toISOString().slice(0, 10) as LocalDate,
  ).execute({ next: (value) => (overview = value), error: jest.fn() });
  const code = () =>
    overview?.kind === 'nextDay' ? overview.day.exercises[0].suggestion.reason.code : null;
  expect(code()).toBe('INCREASE_LOAD');

  // The last set was really 10, not 12: the cap is no longer reached.
  await new UpdatePastSet(workouts).execute('w1', 's2', { ...SET, loadKg: 100, reps: 10, rir: 2 });

  expect(code()).not.toBe('INCREASE_LOAD');
});
