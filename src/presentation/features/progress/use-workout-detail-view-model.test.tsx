import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

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
  InMemoryRoutineTemplateRepository,
  InMemoryWorkoutRepository,
} from '@/domain/testing/in-memory-repositories';
import { useWorkoutDetailViewModel } from '@/presentation/features/progress/use-workout-detail-view-model';
import { stepReps } from '@/presentation/features/workout/set-form';
import { routineUseCasesOver, someUseCases } from '@/presentation/use-cases/testing';
import { UseCasesProvider, type UseCases } from '@/presentation/use-cases/use-cases-context';

const PAST = aWorkout({
  id: 'w1',
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

async function renderViewModel(id = 'w1', useCases?: UseCases) {
  const workouts = new InMemoryWorkoutRepository(null, [PAST]);
  let n = 0;
  const hook = await renderHook(() => useWorkoutDetailViewModel(id), {
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
              exercises: [anExercise()],
              newId: () => `new-${++n}`,
            }),
          )
        }
      >
        {children}
      </UseCasesProvider>
    ),
  });
  const exercise = (id: string) => workouts.finished[0]?.exercises.find((e) => e.id === id);
  return { ...hook, workouts, exercise };
}

describe('useWorkoutDetailViewModel', () => {
  it('loading until the detail arrives', async () => {
    const { result } = await renderViewModel('w1', someUseCases());

    expect(result.current.state).toEqual({ status: 'loading' });
  });

  it('missing for a workout that is not in the history', async () => {
    const { result } = await renderViewModel('other');

    expect(result.current.state).toEqual({ status: 'missing' });
  });

  it('error when the local read fails', async () => {
    const { result, workouts } = await renderViewModel();
    await act(() => workouts.failFinished());

    expect(result.current.state).toEqual({ status: 'error' });
  });

  it('RF-PROG-02.AC1: content; sets open only while editing', async () => {
    const { result } = await renderViewModel();
    expect(result.current.state).toMatchObject({ status: 'content', detail: { id: 'w1' } });

    await act(() => result.current.actions.openSet('we-1', 's1'));
    expect(result.current.sheet).toBeNull();
    await act(() => result.current.actions.startEditing());
    await act(() => result.current.actions.openSet('we-1', 's1'));

    expect(result.current.sheet).toMatchObject({ kind: 'edit', number: 1 });
  });

  it('RF-PROG-03.AC1: a corrected set is saved', async () => {
    const { result, exercise } = await renderViewModel();
    await act(() => result.current.actions.startEditing());
    await act(() => result.current.actions.openSet('we-1', 's1'));

    await act(() => result.current.actions.editForm((form) => stepReps(form, 'reps', 1)));
    await act(() => result.current.actions.save());

    expect(exercise('we-1')!.sets[0]).toMatchObject({ reps: 9 });
    expect(result.current.sheet).toBeNull();
  });

  it('RF-PROG-03.AC3: a forgotten set is added to a skipped exercise', async () => {
    const { result, exercise } = await renderViewModel();
    await act(() => result.current.actions.startEditing());

    await act(() => result.current.actions.addSet('we-2'));
    expect(result.current.sheet).toMatchObject({ kind: 'adjust', number: 1 });
    await act(() => result.current.actions.editForm((form) => ({ ...form, loadKg: 50 })));
    await act(() => result.current.actions.save());

    expect(exercise('we-2')).toMatchObject({ status: 'done', sets: [{ loadKg: 50, reps: 8 }] });
  });

  it('RF-PROG-03.AC2: deleting a set asks with D16 first', async () => {
    const { result, exercise } = await renderViewModel();
    await act(() => result.current.actions.startEditing());
    await act(() => result.current.actions.openSet('we-1', 's1'));

    await act(() => result.current.actions.askDeleteSet());
    expect(result.current.confirm).toMatchObject({ target: 'set' });
    await act(() => result.current.actions.confirmDelete());

    expect(exercise('we-1')!.sets).toEqual([]);
  });

  it('RF-PROG-03.AC4: deleting the workout asks with D16, then it is missing', async () => {
    const { result } = await renderViewModel();

    await act(() => result.current.actions.askDeleteWorkout());
    expect(result.current.confirm).toEqual({ target: 'workout', sets: 1 });
    await act(() => result.current.actions.confirmDelete());

    expect(result.current.state).toEqual({ status: 'missing' });
  });

  it('RF-PROG-03.AC6: a value out of RN-ENT-02 shows the error and is not saved', async () => {
    const { result, exercise } = await renderViewModel();
    await act(() => result.current.actions.startEditing());
    await act(() => result.current.actions.openSet('we-1', 's1'));

    await act(() => result.current.actions.editForm((form) => ({ ...form, reps: 101 })));
    await act(() => result.current.actions.save());

    expect(result.current.sheet).toMatchObject({ errors: { reps: true } });
    expect(exercise('we-1')!.sets[0]).toMatchObject({ reps: 8 });
  });
});
