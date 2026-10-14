import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import type { Workout } from '@/domain/models/workout';
import { defaultProfile } from '@/domain/rules/routine/default-profile';
import { aBilateralSet, aRoutine, aWorkout, aWorkoutExercise } from '@/domain/testing/builders';
import {
  InMemoryProfileRepository,
  InMemoryRoutineRepository,
  InMemoryRoutineTemplateRepository,
  InMemoryWorkoutRepository,
} from '@/domain/testing/in-memory-repositories';
import { useWorkoutResume } from '@/presentation/features/workout/use-workout-resume';
import { routineUseCasesOver, someUseCases } from '@/presentation/use-cases/testing';
import { UseCasesProvider } from '@/presentation/use-cases/use-cases-context';

const STARTED = new Date('2026-10-13T18:00:00Z');
const LAST_SET = new Date('2026-10-13T18:40:00Z');
const RUNNING = aWorkout({
  status: 'in_progress',
  startedAt: STARTED,
  finishedAt: null,
  exercises: [
    aWorkoutExercise({ status: 'done', sets: [aBilateralSet({ completedAt: LAST_SET })] }),
  ],
});

async function renderResume(now: string, inProgress: Workout | null = RUNNING) {
  const workouts = new InMemoryWorkoutRepository(inProgress);
  const onResume = jest.fn();
  const onFinished = jest.fn();
  const hook = await renderHook(() => useWorkoutResume({ onResume, onFinished }), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <UseCasesProvider
        useCases={someUseCases(
          routineUseCasesOver({
            routines: new InMemoryRoutineRepository([aRoutine()]),
            templates: new InMemoryRoutineTemplateRepository(),
            profiles: new InMemoryProfileRepository(defaultProfile()),
            workouts,
            now: () => new Date(now),
          }),
        )}
      >
        {children}
      </UseCasesProvider>
    ),
  });
  return { ...hook, workouts, onResume, onFinished };
}

describe('useWorkoutResume (RF-ENT-13)', () => {
  it('without a workout in progress nothing happens', async () => {
    const { result, onResume } = await renderResume('2026-10-13T19:00:00Z', null);

    expect(result.current.abandoned).toBeNull();
    expect(onResume).not.toHaveBeenCalled();
  });

  it('AC1: a workout in progress opens S09 again', async () => {
    const { onResume } = await renderResume('2026-10-13T19:00:00Z');

    expect(onResume).toHaveBeenCalledTimes(1);
  });

  it('AC2: after 12 h, D02 asks; «Finalizarlo» ends it at its last set', async () => {
    const { result, workouts, onFinished, onResume } = await renderResume('2026-10-14T07:00:00Z');

    expect(onResume).not.toHaveBeenCalled();
    expect(result.current.abandoned).toEqual({ startedAt: STARTED, sets: 1 });
    await act(() => result.current.actions.finish());

    expect(workouts.finished[0].finishedAt).toEqual(LAST_SET);
    expect(onFinished).toHaveBeenCalledWith(RUNNING.id);
    expect(result.current.abandoned).toBeNull();
  });

  it('AC2: «Continuar» opens S09, «Descartar» deletes it', async () => {
    const first = await renderResume('2026-10-14T07:00:00Z');
    await act(() => first.result.current.actions.continue());
    expect(first.onResume).toHaveBeenCalled();

    const second = await renderResume('2026-10-14T07:00:00Z');
    await act(() => second.result.current.actions.discard());
    expect(second.workouts.inProgress).toBeNull();
  });
});
