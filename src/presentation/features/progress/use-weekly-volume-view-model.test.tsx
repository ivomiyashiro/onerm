import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { defaultProfile } from '@/domain/rules/routine/default-profile';
import { aRoutine } from '@/domain/testing/builders';
import {
  InMemoryProfileRepository,
  InMemoryRoutineRepository,
  InMemoryRoutineTemplateRepository,
  InMemoryWorkoutRepository,
} from '@/domain/testing/in-memory-repositories';
import { useWeeklyVolumeViewModel } from '@/presentation/features/progress/use-weekly-volume-view-model';
import { routineUseCasesOver, someUseCases } from '@/presentation/use-cases/testing';
import { UseCasesProvider, type UseCases } from '@/presentation/use-cases/use-cases-context';

async function renderViewModel(useCases?: UseCases) {
  const workouts = new InMemoryWorkoutRepository();
  const hook = await renderHook(() => useWeeklyVolumeViewModel(), {
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
              now: () => new Date('2026-10-14T12:00:00Z'),
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

describe('useWeeklyVolumeViewModel', () => {
  it('loading until the volume arrives', async () => {
    const { result } = await renderViewModel(someUseCases());

    expect(result.current.state).toEqual({ status: 'loading' });
  });

  it('RF-PROG-06.AC1: this week first', async () => {
    const { result } = await renderViewModel();

    expect(result.current.weeksAgo).toBe(0);
    expect(result.current.state).toMatchObject({
      status: 'content',
      volume: { weekStart: '2026-10-12' },
    });
  });

  it('RF-PROG-06.AC2: earlier weeks, never past this one', async () => {
    const { result } = await renderViewModel();

    await act(() => result.current.actions.previousWeek());
    expect(result.current.state).toMatchObject({ volume: { weekStart: '2026-10-05' } });
    await act(() => result.current.actions.nextWeek());
    await act(() => result.current.actions.nextWeek());

    expect(result.current.weeksAgo).toBe(0);
  });

  it('error when the local read fails', async () => {
    const { result, workouts } = await renderViewModel();
    await act(() => workouts.failFinished());

    expect(result.current.state).toEqual({ status: 'error' });
  });
});
