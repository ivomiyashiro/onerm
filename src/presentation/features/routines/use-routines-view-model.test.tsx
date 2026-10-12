import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import type { Profile } from '@/domain/models/profile';
import type { Routine } from '@/domain/models/routine';
import type { Workout } from '@/domain/models/workout';
import { defaultProfile } from '@/domain/rules/routine/default-profile';
import { aRoutine, aRoutineTemplate, aWorkout } from '@/domain/testing/builders';
import {
  InMemoryProfileRepository,
  InMemoryRoutineRepository,
  InMemoryRoutineTemplateRepository,
  InMemoryWorkoutRepository,
} from '@/domain/testing/in-memory-repositories';
import { useRoutinesViewModel } from '@/presentation/features/routines/use-routines-view-model';
import { routineUseCasesOver, someUseCases } from '@/presentation/use-cases/testing';
import { UseCasesProvider } from '@/presentation/use-cases/use-cases-context';

const ACTIVE = aRoutine({ id: 'active', name: 'Cuerpo completo' });
const OTHER = aRoutine({ id: 'other', name: 'Mi rutina de pierna' });
const IN_PROGRESS = aWorkout({ status: 'in_progress', finishedAt: null });

async function renderViewModel({
  profile = { ...defaultProfile(), activeRoutineId: 'active' } as Profile | null,
  routines = [ACTIVE, OTHER] as Routine[],
  inProgress = null as Workout | null,
} = {}) {
  const repositories = {
    routines: new InMemoryRoutineRepository(routines),
    templates: new InMemoryRoutineTemplateRepository([aRoutineTemplate()]),
    profiles: new InMemoryProfileRepository(profile),
    workouts: new InMemoryWorkoutRepository(inProgress),
  };
  const wrapper = ({ children }: { children: ReactNode }) => (
    <UseCasesProvider useCases={someUseCases(routineUseCasesOver(repositories))}>
      {children}
    </UseCasesProvider>
  );
  const hook = await renderHook(() => useRoutinesViewModel(), { wrapper });
  return { ...hook, ...repositories };
}

describe('useRoutinesViewModel', () => {
  it('is loading until the routines arrive', async () => {
    const { result } = await renderHook(() => useRoutinesViewModel(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <UseCasesProvider useCases={someUseCases()}>{children}</UseCasesProvider>
      ),
    });

    expect(result.current.state).toEqual({ status: 'loading' });
  });

  it('content: Mis rutinas, the active one and the templates', async () => {
    const { result } = await renderViewModel();

    expect(result.current.state).toMatchObject({
      status: 'content',
      overview: {
        activeRoutineId: 'active',
        recommendedTemplateId: 'PLT-FB3',
      },
    });
  });

  it('error: a failed read, and retry reads again', async () => {
    const { result, routines } = await renderViewModel();

    await act(() => routines.fail());
    expect(result.current.state).toEqual({ status: 'error' });

    await act(() => result.current.actions.retry());
    expect(result.current.state.status).toBe('content');
  });

  it('RF-RUT-07.AC1: activating with another active asks with D07, then activates', async () => {
    const { result, profiles } = await renderViewModel();

    await act(() => result.current.actions.activate('other'));
    expect(result.current.dialog).toEqual({
      kind: 'replaceActive',
      routineName: 'Mi rutina de pierna',
      activeName: 'Cuerpo completo',
    });

    await act(() => result.current.actions.confirmDialog());
    expect(profiles.profile?.activeRoutineId).toBe('other');
    expect(result.current.dialog).toBeNull();
  });

  it('RF-RUT-07.AC1: without an active routine it activates at once', async () => {
    const { result, profiles } = await renderViewModel({ profile: defaultProfile() });

    await act(() => result.current.actions.activate('other'));

    expect(result.current.dialog).toBeNull();
    expect(profiles.profile?.activeRoutineId).toBe('other');
  });

  it('RF-RUT-07.AC2: with a workout in progress shows D14 and changes nothing', async () => {
    const { result, profiles } = await renderViewModel({ inProgress: IN_PROGRESS });

    await act(() => result.current.actions.activate('other'));

    expect(result.current.dialog).toEqual({ kind: 'workoutInProgress', action: 'changeRoutine' });
    expect(profiles.profile?.activeRoutineId).toBe('active');
  });

  it('RF-RUT-08.AC1: deleting asks with D11, then deletes', async () => {
    const { result, routines } = await renderViewModel();

    await act(() => result.current.actions.remove('other'));
    expect(result.current.dialog).toEqual({ kind: 'delete', routineName: 'Mi rutina de pierna' });

    await act(() => result.current.actions.confirmDialog());
    expect(routines.routines.map((r) => r.id)).toEqual(['active']);
  });

  it('RF-RUT-08.AC3: deleting the active routine during a workout shows D14', async () => {
    const { result } = await renderViewModel({ inProgress: IN_PROGRESS });

    await act(() => result.current.actions.remove('active'));

    expect(result.current.dialog).toEqual({ kind: 'workoutInProgress', action: 'deleteRoutine' });
  });

  it('dismissing a dialog changes nothing', async () => {
    const { result, routines } = await renderViewModel();
    await act(() => result.current.actions.remove('other'));

    await act(() => result.current.actions.dismissDialog());

    expect(result.current.dialog).toBeNull();
    expect(routines.routines).toHaveLength(2);
  });
});
