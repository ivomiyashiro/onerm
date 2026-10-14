import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { defaultProfile } from '@/domain/rules/routine/default-profile';
import { aBilateralSet, aRoutine, aWorkout, aWorkoutExercise } from '@/domain/testing/builders';
import {
  InMemoryProfileRepository,
  InMemoryRoutineRepository,
  InMemoryRoutineTemplateRepository,
  InMemoryWorkoutRepository,
} from '@/domain/testing/in-memory-repositories';
import { useWorkoutSummaryViewModel } from '@/presentation/features/summary/use-workout-summary-view-model';
import { routineUseCasesOver, someUseCases } from '@/presentation/use-cases/testing';
import { UseCasesProvider, type UseCases } from '@/presentation/use-cases/use-cases-context';

const FINISHED = aWorkout({
  id: 'w1',
  exercises: [aWorkoutExercise({ status: 'done', sets: [aBilateralSet()] })],
});

async function renderViewModel(id = 'w1', useCases?: UseCases) {
  const workouts = new InMemoryWorkoutRepository(null, [FINISHED]);
  const hook = await renderHook(() => useWorkoutSummaryViewModel(id), {
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

describe('useWorkoutSummaryViewModel', () => {
  it('loading until the summary arrives', async () => {
    const { result } = await renderViewModel('w1', someUseCases());

    expect(result.current).toEqual({ status: 'loading' });
  });

  it('RF-ENT-11.AC1: content with the summary of the workout', async () => {
    const { result } = await renderViewModel();

    expect(result.current).toMatchObject({ status: 'content', summary: { sets: 1 } });
  });

  it('missing once the workout is gone', async () => {
    const { result } = await renderViewModel('other');

    expect(result.current).toEqual({ status: 'missing' });
  });

  it('error when the local read fails', async () => {
    const { result, workouts } = await renderViewModel();
    await act(() => workouts.failFinished());

    expect(result.current).toEqual({ status: 'error' });
  });
});
