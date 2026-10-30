import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import type { Workout } from '@/domain/models/workout';
import { defaultProfile } from '@/domain/rules/routine/default-profile';
import { aRoutine, aWorkout } from '@/domain/testing/builders';
import {
  InMemoryProfileRepository,
  InMemoryRoutineRepository,
  InMemoryRoutineTemplateRepository,
  InMemoryWorkoutRepository,
} from '@/domain/testing/in-memory-repositories';
import { useHistoryViewModel } from '@/presentation/features/progress/use-history-view-model';
import { routineUseCasesOver, someUseCases } from '@/presentation/use-cases/testing';
import { UseCasesProvider, type UseCases } from '@/presentation/use-cases/use-cases-context';

const on = (id: string, month: number, day: number) =>
  aWorkout({
    id,
    startedAt: new Date(2026, month, day, 18),
    finishedAt: new Date(2026, month, day, 19),
  });

async function renderViewModel(finished: Workout[], useCases?: UseCases) {
  const workouts = new InMemoryWorkoutRepository(null, finished);
  const hook = await renderHook(() => useHistoryViewModel(), {
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
            }),
          )
        }
      >
        {children}
      </UseCasesProvider>
    ),
  });
  return { ...hook, workouts };
}

describe('useHistoryViewModel', () => {
  it('loading until the history arrives', async () => {
    const { result } = await renderViewModel([], someUseCases());

    expect(result.current.state).toEqual({ status: 'loading' });
  });

  it('RF-PROG-01.AC1: newest first, grouped by month', async () => {
    const { result } = await renderViewModel([
      on('sep-28', 8, 28),
      on('sep-30', 8, 30),
      on('oct-1', 9, 1),
    ]);

    expect(result.current.state).toMatchObject({
      status: 'content',
      months: [
        { title: 'octubre 2026', items: [{ id: 'oct-1' }] },
        { title: 'septiembre 2026', items: [{ id: 'sep-30' }, { id: 'sep-28' }] },
      ],
    });
  });

  it('RF-PROG-01.AC3: empty without finished workouts', async () => {
    const { result } = await renderViewModel([]);

    expect(result.current.state).toEqual({ status: 'empty' });
  });

  it('error on a failed read, and «Reintentar» reads again', async () => {
    const { result, workouts } = await renderViewModel([on('oct-1', 9, 1)]);
    await act(() => workouts.failFinished());
    expect(result.current.state).toEqual({ status: 'error' });

    await act(() => result.current.actions.retry());

    expect(result.current.state).toMatchObject({ status: 'content' });
  });

  it('RF-PROG-03.AC4 from S18: deleting asks with D16 and the workout leaves the history', async () => {
    const { result } = await renderViewModel([on('sep-30', 8, 30), on('oct-1', 9, 1)]);
    const [october] = result.current.state.status === 'content' ? result.current.state.months : [];

    await act(() => result.current.actions.askDelete(october.items[0]));
    expect(result.current.confirm).toEqual({ workoutId: 'oct-1', sets: 0 });
    await act(() => result.current.actions.confirmDelete());

    expect(result.current.confirm).toBeNull();
    expect(result.current.state).toMatchObject({
      status: 'content',
      months: [{ title: 'septiembre 2026', items: [{ id: 'sep-30' }] }],
    });
  });

  it('cancelling D16 keeps the workout', async () => {
    const { result } = await renderViewModel([on('oct-1', 9, 1)]);
    const [october] = result.current.state.status === 'content' ? result.current.state.months : [];

    await act(() => result.current.actions.askDelete(october.items[0]));
    await act(() => result.current.actions.closeConfirm());

    expect(result.current.confirm).toBeNull();
    expect(result.current.state).toMatchObject({ months: [{ items: [{ id: 'oct-1' }] }] });
  });
});
