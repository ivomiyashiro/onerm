import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import type { Profile } from '@/domain/models/profile';
import { defaultProfile } from '@/domain/rules/routine/default-profile';
import { aRoutine } from '@/domain/testing/builders';
import {
  InMemoryProfileRepository,
  InMemoryRoutineRepository,
} from '@/domain/testing/in-memory-repositories';
import { AdjustActiveRoutine } from '@/domain/usecases/adjust-active-routine';
import { ObserveProfile } from '@/domain/usecases/observe-profile';
import { UpdateProfile } from '@/domain/usecases/update-profile';
import { useProfileViewModel } from '@/presentation/features/profile/use-profile-view-model';
import { someUseCases } from '@/presentation/use-cases/testing';
import { UseCasesProvider } from '@/presentation/use-cases/use-cases-context';

const WITH_ROUTINE: Profile = { ...defaultProfile(), activeRoutineId: 'routine-1' };

async function renderViewModel(profile: Profile | null = WITH_ROUTINE) {
  const profiles = new InMemoryProfileRepository(profile);
  const routines = new InMemoryRoutineRepository([aRoutine()]);
  const useCases = someUseCases({
    observeProfile: new ObserveProfile(profiles),
    updateProfile: new UpdateProfile(profiles, routines),
    adjustActiveRoutine: new AdjustActiveRoutine(profiles, routines),
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <UseCasesProvider useCases={useCases}>{children}</UseCasesProvider>
  );
  const hook = await renderHook(() => useProfileViewModel(), { wrapper });
  return { ...hook, profiles, routines };
}

describe('useProfileViewModel', () => {
  it('is loading until the profile arrives', async () => {
    const { result } = await renderHook(() => useProfileViewModel(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <UseCasesProvider useCases={someUseCases()}>{children}</UseCasesProvider>
      ),
    });

    expect(result.current.state).toEqual({ status: 'loading' });
  });

  it('content: the stored profile', async () => {
    const { result } = await renderViewModel();

    expect(result.current.state).toEqual({ status: 'content', profile: WITH_ROUTINE });
  });

  it('a sheet opens with the current value and «Guardar» saves the chosen one', async () => {
    const { result, profiles } = await renderViewModel();

    await act(() => result.current.actions.open('days'));
    expect(result.current.sheet).toEqual({ setting: 'days', draft: { daysPerWeek: 3 } });

    await act(() => result.current.actions.choose({ daysPerWeek: 5 }));
    await act(() => result.current.actions.save());

    expect(profiles.profile?.daysPerWeek).toBe(5);
    expect(result.current.sheet).toBeNull();
    expect(result.current.dialog).toBeNull();
  });

  it('RF-PERF-03.AC2: a new goal with an active routine asks with D06; «Ajustar» adjusts it', async () => {
    const { result, routines } = await renderViewModel();

    await act(() => result.current.actions.open('goal'));
    await act(() => result.current.actions.choose({ goal: 'strength' }));
    await act(() => result.current.actions.save());
    expect(result.current.dialog).toEqual({ kind: 'adjust', goal: 'strength' });

    await act(() => result.current.actions.adjust());

    expect(routines.routines[0].days[0].exercises[0].prescription.repRange).toEqual({
      min: 4,
      max: 6,
    });
    expect(result.current.dialog).toBeNull();
  });

  it('RF-PERF-03.AC2: «Dejar como está» leaves the routine as it was', async () => {
    const { result, routines } = await renderViewModel();
    const before = routines.routines[0];

    await act(() => result.current.actions.open('goal'));
    await act(() => result.current.actions.choose({ goal: 'strength' }));
    await act(() => result.current.actions.save());
    await act(() => result.current.actions.keep());

    expect(routines.routines[0]).toBe(before);
    expect(result.current.dialog).toBeNull();
  });

  it('closing a sheet saves nothing', async () => {
    const { result, profiles } = await renderViewModel();

    await act(() => result.current.actions.open('unit'));
    await act(() => result.current.actions.choose({ unit: 'lb' }));
    await act(() => result.current.actions.close());

    expect(profiles.profile?.unit).toBe('kg');
  });

  it('error: a failed read, and retry reads again', async () => {
    const { result, profiles } = await renderViewModel();

    await act(() => profiles.fail());
    expect(result.current.state).toEqual({ status: 'error' });

    await act(() => result.current.actions.retry());
    expect(result.current.state.status).toBe('content');
  });
});
