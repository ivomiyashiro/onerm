import type { LocalDate } from '@/domain/models/local-date';
import type { Workout } from '@/domain/models/workout';
import { defaultProfile } from '@/domain/rules/routine/default-profile';
import {
  aBilateralSet,
  anExercise,
  aRoutine,
  aRoutineDay,
  aRoutineExercise,
  aWorkout,
  aWorkoutExercise,
} from '@/domain/testing/builders';
import {
  InMemoryProfileRepository,
  InMemoryRoutineRepository,
  InMemoryWorkoutRepository,
} from '@/domain/testing/in-memory-repositories';
import { ObserveWorkout, type WorkoutOverview } from '@/domain/usecases/observe-workout';

const localDate = (instant: Date) => instant.toISOString().slice(0, 10) as LocalDate;
const SQUAT = anExercise();
const RUNNING = aWorkout({
  id: 'running',
  status: 'in_progress',
  startedAt: new Date('2026-10-13T18:00:00Z'),
  finishedAt: null,
  exercises: [aWorkoutExercise({ id: 'we-1', routineExerciseId: 're-1' })],
});
const ROUTINE = aRoutine({
  days: [aRoutineDay({ exercises: [aRoutineExercise({ id: 're-1', notes: 'Pausa abajo' })] })],
});
const LAST_TIME = aWorkout({
  exercises: [
    aWorkoutExercise({
      status: 'done',
      sets: [0, 1, 2].map((position) =>
        aBilateralSet({ id: `s${position}`, position, loadKg: 100, reps: 12, rir: 2 }),
      ),
    }),
  ],
});

function observe(inProgress: Workout | null = RUNNING) {
  const workouts = new InMemoryWorkoutRepository(inProgress, [LAST_TIME]);
  const values: (WorkoutOverview | null)[] = [];
  new ObserveWorkout(
    new InMemoryProfileRepository(defaultProfile()),
    new InMemoryRoutineRepository([ROUTINE]),
    workouts,
    { observeAll: (o) => (o.next([SQUAT]), () => {}) },
    localDate,
  ).execute({ next: (value) => values.push(value), error: jest.fn() });
  return { workouts, last: () => values.at(-1) };
}

describe('ObserveWorkout', () => {
  it('no workout in progress: null', () => {
    expect(observe(null).last()).toBeNull();
  });

  it('RF-SUG-01.AC2, RF-RUT-06.AC2: each exercise with its name, note and suggestion', () => {
    const view = observe().last()!;

    expect(view.workout.id).toBe('running');
    expect(view.exercises[0]).toMatchObject({
      name: 'Sentadilla con barra',
      notes: 'Pausa abajo',
      // 3 × 12 at the cap of 8–12 → more load (RN-SUG-03).
      suggestion: { reason: { code: 'INCREASE_LOAD' } },
      grid: { unit: 'kg', increment: 2.5 },
    });
  });

  it('RNF-03: logging a set re-emits without running the engine again', async () => {
    const { workouts, last } = observe();
    const first = last()!.exercises[0].suggestion;

    await workouts.save({
      ...RUNNING,
      exercises: [{ ...RUNNING.exercises[0], sets: [aBilateralSet({ workoutExerciseId: 'we-1' })] }],
    });

    // SQLite re-reads the history after any write to the workout tables: the same history.
    await workouts.save(LAST_TIME);

    expect(last()!.workout.exercises[0].sets).toHaveLength(1);
    expect(last()!.exercises[0].suggestion).toBe(first);
  });
});
