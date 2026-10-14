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
  aPrescription,
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

function observe(
  inProgress: Workout | null = RUNNING,
  { profile = defaultProfile(), finished = [LAST_TIME] } = {},
) {
  const workouts = new InMemoryWorkoutRepository(inProgress, finished);
  const values: (WorkoutOverview | null)[] = [];
  new ObserveWorkout(
    new InMemoryProfileRepository(profile),
    new InMemoryRoutineRepository([ROUTINE]),
    workouts,
    { observeAll: (o) => (o.next([SQUAT]), () => {}) },
    localDate,
  ).execute({ next: (value) => values.push(value), error: jest.fn() });
  return { workouts, last: () => values.at(-1) };
}

describe('ObserveWorkout', () => {
  it('RF-ENT-09.AC3, RN-SUG-15: a substitute goes by its own EE, never as ERR', () => {
    const substitute = (sets: number[]) =>
      aWorkoutExercise({
        id: 'we-1',
        routineExerciseId: 're-1',
        plannedExerciseId: 'barbell-back-squat',
        exerciseId: 'leg-press',
        sets: sets.map((position) =>
          aBilateralSet({ id: `s${position}`, position, loadKg: 100, reps: 12, rir: 2 }),
        ),
      });
    const before = aWorkout({ id: 'before', exercises: [substitute([0, 1, 2])] });
    const running = { ...RUNNING, exercises: [substitute([])] };

    const view = observe(running, { finished: [before] }).last()!;

    // As an ERR, 3 × 12 at the cap would raise the load (RN-SUG-03).
    expect(view.exercises[0].suggestion.reason.code).not.toBe('INCREASE_LOAD');
    // «En lugar de Sentadilla con barra» (Figma «S09 · Ejercicio sustituido»).
    expect(view.exercises[0].plannedName).toBe('Sentadilla con barra');
  });

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
      exercises: [
        { ...RUNNING.exercises[0], sets: [aBilateralSet({ workoutExerciseId: 'we-1' })] },
      ],
    });

    // SQLite re-reads the history after any write to the workout tables: the same history.
    await workouts.save(LAST_TIME);

    expect(last()!.workout.exercises[0].sets).toHaveLength(1);
    expect(last()!.exercises[0].suggestion).toBe(first);
  });

  it('RF-SUG-07.AC2: the explanation of each suggestion and the level of the user', () => {
    const view = observe(RUNNING, { profile: { ...defaultProfile(), level: 'advanced' } }).last()!;

    expect(view.level).toBe('advanced');
    expect(view.exercises[0].explanation).toMatchObject({
      suggestion: view.exercises[0].suggestion,
      lastTime: { at: LAST_TIME.finishedAt },
    });
  });

  it('RF-SUG-02.AC6: in calibration the next set comes from the last one (RN-SUG-06)', () => {
    const calibrating = aWorkout({
      ...RUNNING,
      exercises: [
        aWorkoutExercise({
          id: 'we-1',
          routineExerciseId: 're-new',
          exerciseId: SQUAT.id,
          plannedExerciseId: SQUAT.id,
          prescription: aPrescription({ repRange: { min: 8, max: 12 }, targetRir: 3 }),
          sets: [aBilateralSet({ workoutExerciseId: 'we-1', loadKg: 60, reps: 12, rir: 4 })],
        }),
      ],
    });
    const exercise = observe(calibrating, { finished: [] }).last()!.exercises[0];

    // RTF 16: máx(60 + 2,5; 60 × 1,2 = 72), down to the grid → 70.
    expect(exercise.suggestion.loadKg).toBe(70);
    expect(exercise.suggestion).toMatchObject({ reason: { code: 'CALIBRATION_STEP' } });
    expect(exercise.recalculated).toBe(true);
    expect(exercise.awaitingEffort).toBeNull();
    // S10 explains the step, not the calibration it came from.
    expect(exercise.explanation).toMatchObject({
      suggestion: exercise.suggestion,
      lastTime: null,
    });
  });

  it('RF-SUG-02.AC1: an estimate from another context carries the name of its exercise', () => {
    const elsewhere = aWorkout({
      ...RUNNING,
      exercises: [aWorkoutExercise({ id: 'we-1', routineExerciseId: 're-other' })],
    });

    const exercise = observe(elsewhere).last()!.exercises[0];

    expect(exercise.suggestion.reason.code).toBe('ESTIMATED_FROM_E1RM');
    expect(exercise.basisName).toBe('Sentadilla con barra');
  });
});
