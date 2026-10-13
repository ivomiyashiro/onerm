import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import type { Workout } from '@/domain/models/workout';
import { defaultProfile } from '@/domain/rules/routine/default-profile';
import {
  aBilateralSet,
  anExercise,
  aPrescription,
  aRoutine,
  aWorkout,
  aWorkoutExercise,
} from '@/domain/testing/builders';
import {
  InMemoryProfileRepository,
  InMemoryRoutineRepository,
  InMemoryRoutineTemplateRepository,
  InMemoryWorkoutRepository,
} from '@/domain/testing/in-memory-repositories';
import { stepReps, typeLoad } from '@/presentation/features/workout/set-form';
import {
  useWorkoutViewModel,
  type WorkoutContent,
} from '@/presentation/features/workout/use-workout-view-model';
import { routineUseCasesOver, someUseCases } from '@/presentation/use-cases/testing';
import { UseCasesProvider, type UseCases } from '@/presentation/use-cases/use-cases-context';

const SQUAT = anExercise();
const PRESS = anExercise({ id: 'press', name: 'Press de banca' });
const twoSets = aPrescription({ sets: 2 });
const RUNNING = aWorkout({
  status: 'in_progress',
  finishedAt: null,
  startedAt: new Date('2026-10-13T18:00:00Z'),
  exercises: [
    aWorkoutExercise({ id: 'we-1', prescription: twoSets }),
    aWorkoutExercise({ id: 'we-2', exerciseId: 'press', position: 1, prescription: twoSets }),
  ],
});
/** 2 × 12 at 100 kg last time: today 105 × 8 (RN-SUG-03). */
const LAST_TIME = aWorkout({
  exercises: ['barbell-back-squat', 'press'].map((exerciseId, i) =>
    aWorkoutExercise({
      id: `old-${i}`,
      routineExerciseId: 're-1',
      exerciseId,
      plannedExerciseId: exerciseId,
      prescription: twoSets,
      status: 'done',
      sets: [0, 1].map((position) =>
        aBilateralSet({
          id: `old-${i}-${position}`,
          workoutExerciseId: `old-${i}`,
          position,
          loadKg: 100,
          reps: 12,
        }),
      ),
    }),
  ),
});

async function renderViewModel({
  inProgress = RUNNING as Workout | null,
  finished = [LAST_TIME],
  useCases = undefined as UseCases | undefined,
} = {}) {
  const workouts = new InMemoryWorkoutRepository(inProgress, finished);
  let n = 0;
  const hook = await renderHook(() => useWorkoutViewModel(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <UseCasesProvider
        useCases={
          useCases ??
          someUseCases(
            routineUseCasesOver({
              routines: new InMemoryRoutineRepository([aRoutine()]),
              templates: new InMemoryRoutineTemplateRepository(),
              profiles: new InMemoryProfileRepository(defaultProfile()),
              workouts,
              exercises: [SQUAT, PRESS],
              newId: () => `set-${++n}`,
              now: () => new Date('2026-10-13T18:05:00Z'),
            }),
          )
        }
      >
        {children}
      </UseCasesProvider>
    ),
  });
  const content = () => hook.result.current.state as WorkoutContent;
  return { ...hook, workouts, content };
}

const sets = (workouts: InMemoryWorkoutRepository, id = 'we-1') =>
  workouts.inProgress!.exercises.find((e) => e.id === id)!.sets;

describe('useWorkoutViewModel', () => {
  it('loading until the workout arrives', async () => {
    const { result } = await renderViewModel({ useCases: someUseCases() });

    expect(result.current.state).toEqual({ status: 'loading' });
  });

  it('none without a workout in progress', async () => {
    const { result } = await renderViewModel({ inProgress: null });

    expect(result.current.state).toEqual({ status: 'none' });
  });

  it('error when the local read fails', async () => {
    const { result, workouts } = await renderViewModel();
    await act(() => workouts.fail());

    expect(result.current.state).toEqual({ status: 'error' });
  });

  it('RF-ENT-01.AC2, RF-SUG-01.AC2: the first exercise with its first set prefilled', async () => {
    const { content } = await renderViewModel();

    expect(content().exerciseIndex).toBe(0);
    expect(content().rows).toEqual([
      { kind: 'current', number: 1, values: { loadKg: 105, reps: 8 } },
      { kind: 'pending', number: 2, values: { loadKg: 105, reps: 8 } },
    ]);
    expect(content().primary).toBe('done');
  });

  it('RF-ENT-02.AC1, AC4: «Hecho» logs the suggestion and asks the effort in its row', async () => {
    const { result, workouts, content } = await renderViewModel();

    expect(await act(() => result.current.actions.done())).toBe('logged');

    expect(sets(workouts)).toMatchObject([{ loadKg: 105, reps: 8, rir: null }]);
    expect(content().rows[0]).toMatchObject({ kind: 'done', askEffort: true });
    await act(() => result.current.actions.chooseEffort(sets(workouts)[0], 'rir', 2));
    expect(sets(workouts)[0]).toMatchObject({ rir: 2 });
    expect(content().rows[0]).toMatchObject({ askEffort: false });
  });

  it('RF-ENT-02.AC2: adjusting the reps in the sheet logs them', async () => {
    const { result, workouts } = await renderViewModel();

    await act(() => result.current.actions.openAdjust());
    await act(() => result.current.actions.editForm((form) => stepReps(form, 'reps', -1)));
    await act(() => result.current.actions.confirmAdjust());

    expect(sets(workouts)).toMatchObject([{ reps: 7 }]);
    expect(result.current.sheet).toBeNull();
  });

  it('RF-ENT-02.AC7: after the last prescribed set it moves to the next exercise', async () => {
    const { result, content } = await renderViewModel();

    await act(() => result.current.actions.done());
    await act(() => result.current.actions.done());

    expect(content().exercise.name).toBe('Press de banca');
  });

  it('RN-ENT-04: a calibration set without a load opens the sheet instead of logging', async () => {
    const { result, workouts } = await renderViewModel({ finished: [] });

    expect(await act(() => result.current.actions.done())).toBe('adjust');

    expect(sets(workouts)).toEqual([]);
    expect(result.current.sheet).toMatchObject({ kind: 'adjust', errors: { load: true } });
  });

  it('RF-ENT-04: a logged set can be corrected, deleted and brought back', async () => {
    const { result, workouts } = await renderViewModel();
    await act(() => result.current.actions.done());

    await act(() => result.current.actions.openSet(sets(workouts)[0].id));
    await act(() => result.current.actions.editForm((form) => stepReps(form, 'reps', 1)));
    await act(() => result.current.actions.saveEdit());
    expect(sets(workouts)).toMatchObject([{ reps: 9 }]);

    await act(() => result.current.actions.openSet(sets(workouts)[0].id));
    await act(() => result.current.actions.deleteSet());
    expect(sets(workouts)).toEqual([]);
    expect(result.current.deleted).toMatchObject({ reps: 9 });

    await act(() => result.current.actions.undo());
    expect(sets(workouts)).toMatchObject([{ reps: 9 }]);
  });

  it('RF-ENT-05: «Agregar serie» adds a row with the values of the last set', async () => {
    const { result, content } = await renderViewModel();
    await act(() => result.current.actions.goTo(0));
    await act(() => result.current.actions.done());
    await act(() => result.current.actions.goTo(0));
    await act(() => result.current.actions.done());
    await act(() => result.current.actions.goTo(0));

    await act(() => result.current.actions.addSet());

    expect(content().rows[2]).toEqual({
      kind: 'current',
      number: 3,
      values: { loadKg: 105, reps: 8 },
    });
  });

  it('RF-ENT-14.AC1: a warm-up set is logged but is not a prescribed set: no move on', async () => {
    const { result, workouts, content } = await renderViewModel();

    await act(() => result.current.actions.openAdjust());
    await act(() => result.current.actions.editForm((form) => ({ ...form, isWarmup: true })));
    await act(() => result.current.actions.confirmAdjust());

    expect(sets(workouts)).toMatchObject([{ isWarmup: true }]);
    expect(content().exerciseIndex).toBe(0);
    expect(content().rows.filter((r) => r.kind !== 'done')).toHaveLength(2);
  });

  it('RF-ENT-02.AC5: a typed load out of range is not logged and the sheet says so', async () => {
    const { result, workouts } = await renderViewModel();

    await act(() => result.current.actions.openAdjust());
    await act(() =>
      result.current.actions.editForm((form) =>
        typeLoad(form, '1200', { unit: 'kg', increment: 2.5, minLoad: 20 }),
      ),
    );

    expect(await act(() => result.current.actions.confirmAdjust())).toBe('invalid');
    expect(sets(workouts)).toEqual([]);
    expect(result.current.sheet).toMatchObject({ kind: 'adjust', errors: { load: true } });
  });

  it('RF-SUG-07.AC1, AC2: the reason under the exercise and «¿Por qué?» with its detail', async () => {
    const { result, content } = await renderViewModel();

    expect(content().reason).toEqual({
      line: '¡Completaste 2 × 12! Subimos a 105 kg.',
      icon: 'up',
    });
    await act(() => result.current.actions.openWhy());
    expect(result.current.sheet).toMatchObject({
      kind: 'why',
      detail: { title: '¿Por qué 105 kg × 8?' },
    });
  });

  it('RF-SUG-02.AC4, AC6: a calibration set waits for its effort, then gives the next load', async () => {
    const { result, workouts, content } = await renderViewModel({ finished: [] });
    const calibrate = () =>
      act(() =>
        result.current.actions.editForm((form) => ({
          ...typeLoad(form, '30', { unit: 'kg', increment: 2.5, minLoad: 20 }),
          reps: 12,
        })),
      );

    await act(() => result.current.actions.openAdjust());
    await calibrate();
    await act(() => result.current.actions.confirmAdjust());

    expect(content().primary).toBe('awaitEffort');
    expect(content().rows[0]).toMatchObject({ kind: 'done', missingEffort: true });
    expect(await act(() => result.current.actions.done())).toBe('none');

    await act(() => result.current.actions.chooseEffort(sets(workouts)[0], 'rir', 4));

    // RTF 16: máx(30 + 2,5; 36 down to the grid) = 35 (RN-SUG-06).
    expect(content().primary).toBe('done');
    expect(content().rows[1]).toMatchObject({ kind: 'current', values: { loadKg: 35 } });
    expect(content().reason.line).toBe('Te sobró bastante: probá con 35 kg.');
  });

  it('RF-SUG-02.AC8: with 0 reps the effort is not asked', async () => {
    const { result, content } = await renderViewModel({ finished: [] });

    await act(() => result.current.actions.openAdjust());
    await act(() =>
      result.current.actions.editForm((form) => ({
        ...typeLoad(form, '40', { unit: 'kg', increment: 2.5, minLoad: 20 }),
        reps: 0,
      })),
    );
    await act(() => result.current.actions.confirmAdjust());

    expect(content().primary).toBe('done');
    expect(content().rows[1]).toMatchObject({ kind: 'current', values: { loadKg: 30 } });
  });
});
