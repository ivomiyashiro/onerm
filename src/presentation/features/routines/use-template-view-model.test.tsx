import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import type { Profile } from '@/domain/models/profile';
import type { Workout } from '@/domain/models/workout';
import { defaultProfile } from '@/domain/rules/routine/default-profile';
import { aRoutine, aRoutineTemplate, aWorkout } from '@/domain/testing/builders';
import {
  InMemoryProfileRepository,
  InMemoryRoutineRepository,
  InMemoryRoutineTemplateRepository,
  InMemoryWorkoutRepository,
} from '@/domain/testing/in-memory-repositories';
import { useTemplateViewModel } from '@/presentation/features/routines/use-template-view-model';
import { routineUseCasesOver, someUseCases } from '@/presentation/use-cases/testing';
import { UseCasesProvider } from '@/presentation/use-cases/use-cases-context';

const MINE = aRoutine({ id: 'mine', name: 'Mi rutina' });

async function renderViewModel({
  id = 'PLT-FB3',
  profile = defaultProfile() as Profile | null,
  inProgress = null as Workout | null,
} = {}) {
  const repositories = {
    routines: new InMemoryRoutineRepository([MINE]),
    templates: new InMemoryRoutineTemplateRepository([
      aRoutineTemplate({ id: 'PLT-FB3', name: 'Cuerpo completo A/B' }),
    ]),
    profiles: new InMemoryProfileRepository(profile),
    workouts: new InMemoryWorkoutRepository(inProgress),
  };
  let n = 0;
  const onAdopted = jest.fn();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <UseCasesProvider
      useCases={someUseCases(routineUseCasesOver({ ...repositories, newId: () => `new-${++n}` }))}
    >
      {children}
    </UseCasesProvider>
  );
  const hook = await renderHook(() => useTemplateViewModel(id, onAdopted), { wrapper });
  return { ...hook, ...repositories, onAdopted };
}

describe('useTemplateViewModel', () => {
  it('is loading until the template arrives', async () => {
    const { result } = await renderHook(() => useTemplateViewModel('PLT-FB3', jest.fn()), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <UseCasesProvider useCases={someUseCases()}>{children}</UseCasesProvider>
      ),
    });

    expect(result.current.state).toEqual({ status: 'loading' });
  });

  it('content: the template with its prescription', async () => {
    const { result } = await renderViewModel();

    expect(result.current.state).toMatchObject({
      status: 'content',
      detail: { template: { id: 'PLT-FB3' }, goal: 'health' },
    });
  });

  it('notFound: a template that is not in the catalog', async () => {
    const { result } = await renderViewModel({ id: 'PLT-XX' });

    expect(result.current.state).toEqual({ status: 'notFound' });
  });

  it('error: a failed read, and retry reads again', async () => {
    const { result, profiles } = await renderViewModel();

    await act(() => profiles.fail());
    expect(result.current.state).toEqual({ status: 'error' });

    await act(() => result.current.actions.retry());
    expect(result.current.state.status).toBe('content');
  });

  it('RF-RUT-02.AC1: without an active routine «Usar esta rutina» adopts it at once', async () => {
    const { result, profiles, onAdopted } = await renderViewModel();

    await act(() => result.current.actions.use());

    expect(profiles.profile?.activeRoutineId).toBe('new-1');
    expect(onAdopted).toHaveBeenCalled();
  });

  it('RF-RUT-02.AC2: with an active routine asks with D07 first', async () => {
    const { result, routines, onAdopted } = await renderViewModel({
      profile: { ...defaultProfile(), activeRoutineId: 'mine' },
    });

    await act(() => result.current.actions.use());
    expect(result.current.dialog).toEqual({
      kind: 'replaceActive',
      routineName: 'Cuerpo completo A/B',
      activeName: 'Mi rutina',
    });
    expect(routines.routines).toHaveLength(1);

    await act(() => result.current.actions.confirmDialog());
    expect(routines.routines.map((r) => r.id)).toEqual(['mine', 'new-1']);
    expect(onAdopted).toHaveBeenCalled();
  });

  it('RF-RUT-02.AC4: with a workout in progress shows D14 and adopts nothing', async () => {
    const { result, routines, onAdopted } = await renderViewModel({
      inProgress: aWorkout({ status: 'in_progress', finishedAt: null }),
    });

    await act(() => result.current.actions.use());

    expect(result.current.dialog).toEqual({ kind: 'workoutInProgress', action: 'changeRoutine' });
    expect(routines.routines).toHaveLength(1);
    expect(onAdopted).not.toHaveBeenCalled();
  });

  it('a second tap while adopting does not copy the template twice', async () => {
    const { result, routines } = await renderViewModel();

    await act(() => Promise.all([result.current.actions.use(), result.current.actions.use()]));

    expect(routines.routines).toHaveLength(2);
  });
});
