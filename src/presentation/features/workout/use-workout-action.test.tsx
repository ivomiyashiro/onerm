import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import type { Profile } from '@/domain/models/profile';
import { defaultProfile } from '@/domain/rules/routine/default-profile';
import { aRoutine, aWorkout } from '@/domain/testing/builders';
import {
  InMemoryProfileRepository,
  InMemoryRoutineRepository,
  InMemoryRoutineTemplateRepository,
  InMemoryWorkoutRepository,
} from '@/domain/testing/in-memory-repositories';
import { useWorkoutAction } from '@/presentation/features/workout/use-workout-action';
import { routineUseCasesOver, someUseCases } from '@/presentation/use-cases/testing';
import { UseCasesProvider } from '@/presentation/use-cases/use-cases-context';

const STARTED = new Date('2026-10-13T18:00:00Z');

async function renderAction({
  profile = { ...defaultProfile(), activeRoutineId: 'routine-1' } as Profile,
  inProgress = false,
} = {}) {
  const workouts = new InMemoryWorkoutRepository(
    inProgress ? aWorkout({ status: 'in_progress', startedAt: STARTED, finishedAt: null }) : null,
  );
  let n = 0;
  const useCases = someUseCases(
    routineUseCasesOver({
      routines: new InMemoryRoutineRepository([aRoutine()]),
      templates: new InMemoryRoutineTemplateRepository(),
      profiles: new InMemoryProfileRepository(profile),
      workouts,
      newId: () => `id-${++n}`,
      now: () => STARTED,
    }),
  );
  const onOpenWorkout = jest.fn();
  const hook = await renderHook(() => useWorkoutAction(onOpenWorkout), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <UseCasesProvider useCases={useCases}>{children}</UseCasesProvider>
    ),
  });
  return { ...hook, workouts, onOpenWorkout };
}

describe('useWorkoutAction', () => {
  it('RF-ENT-01.AC1, AC2: «Empezar» starts the next day and opens the workout', async () => {
    const { result, workouts, onOpenWorkout } = await renderAction();
    expect(result.current.action).toEqual({ kind: 'start' });

    await act(() => result.current.run());

    expect(workouts.inProgress?.routineDayId).toBe('day-1');
    expect(onOpenWorkout).toHaveBeenCalled();
  });

  it('RF-ENT-01.AC4: with a workout in progress it is «Continuar» with its start', async () => {
    const { result, onOpenWorkout } = await renderAction({ inProgress: true });

    expect(result.current.action).toEqual({ kind: 'continue', startedAt: STARTED });
    await act(() => result.current.run());
    expect(onOpenWorkout).toHaveBeenCalled();
  });

  it('RF-ENT-01.AC7: without an active routine it is disabled', async () => {
    const { result } = await renderAction({ profile: defaultProfile() });

    expect(result.current.action).toEqual({ kind: 'disabled' });
  });

  it('disabled while loading', async () => {
    const { result } = await renderHook(() => useWorkoutAction(jest.fn()), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <UseCasesProvider useCases={someUseCases()}>{children}</UseCasesProvider>
      ),
    });

    expect(result.current.action).toEqual({ kind: 'disabled' });
  });
});
