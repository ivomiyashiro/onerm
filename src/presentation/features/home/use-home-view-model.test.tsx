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
import { useHomeViewModel } from '@/presentation/features/home/use-home-view-model';
import {
  backupNoticeOver,
  routineUseCasesOver,
  someUseCases,
} from '@/presentation/use-cases/testing';
import { UseCasesProvider } from '@/presentation/use-cases/use-cases-context';

async function renderViewModel(
  profile: Profile | null = { ...defaultProfile(), activeRoutineId: 'routine-1' },
  inProgress = null as ReturnType<typeof aWorkout> | null,
) {
  const repositories = {
    routines: new InMemoryRoutineRepository([aRoutine()]),
    templates: new InMemoryRoutineTemplateRepository(),
    profiles: new InMemoryProfileRepository(profile),
    workouts: new InMemoryWorkoutRepository(inProgress),
  };
  const wrapper = ({ children }: { children: ReactNode }) => (
    <UseCasesProvider useCases={someUseCases(routineUseCasesOver(repositories))}>
      {children}
    </UseCasesProvider>
  );
  const hook = await renderHook(() => useHomeViewModel(), { wrapper });
  return { ...hook, ...repositories };
}

describe('useHomeViewModel', () => {
  it('is loading until the next day arrives', async () => {
    const { result } = await renderHook(() => useHomeViewModel(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <UseCasesProvider useCases={someUseCases()}>{children}</UseCasesProvider>
      ),
    });

    expect(result.current.state).toEqual({ status: 'loading' });
  });

  it('content: the next day of the active routine', async () => {
    const { result } = await renderViewModel();

    expect(result.current.state).toMatchObject({
      status: 'content',
      nextDay: { routine: { id: 'routine-1' }, day: { id: 'day-1' } },
    });
  });

  it('RF-RUT-08.AC2: empty without an active routine', async () => {
    const { result } = await renderViewModel(defaultProfile());

    expect(result.current.state).toEqual({ status: 'empty' });
  });

  it('error: a failed read, and retry reads again', async () => {
    const { result, routines } = await renderViewModel();

    await act(() => routines.fail());
    expect(result.current.state).toEqual({ status: 'error' });

    await act(() => result.current.actions.retry());
    expect(result.current.state.status).toBe('content');
  });

  it('RF-ENT-01.AC4: the start of the workout in progress, or null', async () => {
    const startedAt = new Date('2026-10-13T18:00:00Z');
    const { result, workouts } = await renderViewModel(
      undefined,
      aWorkout({ status: 'in_progress', startedAt, finishedAt: null }),
    );
    expect(result.current.inProgressSince).toEqual(startedAt);

    await act(() => workouts.fail());
    expect(result.current.inProgressSince).toBeNull();
  });

  it('RF-SYNC-06.AC2: a discreet notice of the changes waiting to be backed up', async () => {
    const { result } = await renderHook(() => useHomeViewModel(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <UseCasesProvider
          useCases={someUseCases({
            observeBackupNotice: backupNoticeOver({
              pending: 3,
              conflicts: 0,
              lastSyncedAt: null,
              restoreCompleted: true,
            }),
          })}
        >
          {children}
        </UseCasesProvider>
      ),
    });

    expect(result.current.backupNotice).toEqual({ kind: 'pending', count: 3, online: true });
  });
});
