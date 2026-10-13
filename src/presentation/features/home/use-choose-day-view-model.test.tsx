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
import { useChooseDayViewModel } from '@/presentation/features/home/use-choose-day-view-model';
import { routineUseCasesOver, someUseCases } from '@/presentation/use-cases/testing';
import { UseCasesProvider, type UseCases } from '@/presentation/use-cases/use-cases-context';

async function renderViewModel(useCases: UseCases) {
  return renderHook(() => useChooseDayViewModel(jest.fn()), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <UseCasesProvider useCases={useCases}>{children}</UseCasesProvider>
    ),
  });
}

const over = (profile = defaultProfile()) => {
  const routines = new InMemoryRoutineRepository([aRoutine()]);
  const useCases = someUseCases(
    routineUseCasesOver({
      routines,
      templates: new InMemoryRoutineTemplateRepository(),
      profiles: new InMemoryProfileRepository(profile),
      workouts: new InMemoryWorkoutRepository(),
    }),
  );
  return { useCases, routines };
};

describe('useChooseDayViewModel', () => {
  it('loading until the days arrive', async () => {
    const { result } = await renderViewModel(someUseCases());

    expect(result.current.state).toEqual({ status: 'loading' });
  });

  it('content: the recommended day starts selected', async () => {
    const { useCases } = over({ ...defaultProfile(), activeRoutineId: 'routine-1' });
    const { result } = await renderViewModel(useCases);

    expect(result.current.state).toMatchObject({
      status: 'content',
      recommendedId: 'day-1',
      selectedId: 'day-1',
    });
  });

  it('unavailable without an active routine or after a read error', async () => {
    expect((await renderViewModel(over().useCases)).result.current.state).toEqual({
      status: 'unavailable',
    });

    const { useCases, routines } = over({ ...defaultProfile(), activeRoutineId: 'routine-1' });
    const { result } = await renderViewModel(useCases);
    await act(() => routines.fail());
    expect(result.current.state).toEqual({ status: 'unavailable' });
  });
});
