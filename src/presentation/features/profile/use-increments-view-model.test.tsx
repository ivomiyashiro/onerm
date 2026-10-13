import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import type { Profile } from '@/domain/models/profile';
import { defaultProfile } from '@/domain/rules/routine/default-profile';
import { InMemoryProfileRepository } from '@/domain/testing/in-memory-repositories';
import { ObserveProfile } from '@/domain/usecases/observe-profile';
import { UpdateLoadSetting } from '@/domain/usecases/update-load-setting';
import { useIncrementsViewModel } from '@/presentation/features/profile/use-increments-view-model';
import { someUseCases } from '@/presentation/use-cases/testing';
import { UseCasesProvider } from '@/presentation/use-cases/use-cases-context';

async function renderViewModel(profile: Profile = defaultProfile()) {
  const profiles = new InMemoryProfileRepository(profile);
  const useCases = someUseCases({
    observeProfile: new ObserveProfile(profiles),
    updateLoadSetting: new UpdateLoadSetting(profiles),
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <UseCasesProvider useCases={useCases}>{children}</UseCasesProvider>
  );
  const hook = await renderHook(() => useIncrementsViewModel(), { wrapper });
  return { ...hook, profiles };
}

describe('useIncrementsViewModel', () => {
  it('content: the increments and the bar of the active unit', async () => {
    const { result } = await renderViewModel({ ...defaultProfile(), unit: 'lb' });

    expect(result.current.state).toEqual({
      status: 'content',
      unit: 'lb',
      increments: { barbell: 5, dumbbell: 5, cable: 5, machine: 10, kettlebell: 10 },
      barWeight: 45,
    });
  });

  it('RF-PERF-06.AC2: editing opens with the current value and saves the typed one', async () => {
    const { result, profiles } = await renderViewModel();

    await act(() => result.current.actions.edit('dumbbell'));
    expect(result.current.editing).toEqual({ setting: 'dumbbell', text: '2', error: false });

    await act(() => result.current.actions.type('2,5'));
    await act(() => result.current.actions.save());

    expect(profiles.profile?.loadIncrementsKg.dumbbell).toBe(2.5);
    expect(result.current.editing).toBeNull();
  });

  it('a value that is not a number or is out of range is not saved and shows the error', async () => {
    const { result, profiles } = await renderViewModel();

    await act(() => result.current.actions.edit('bar'));
    await act(() => result.current.actions.type('150'));
    await act(() => result.current.actions.save());

    expect(result.current.editing).toMatchObject({ setting: 'bar', error: true });
    expect(profiles.profile?.barWeightKg).toBe(20);
  });

  it('RN-PERF-05: more decimals than the unit shows are not saved', async () => {
    const { result, profiles } = await renderViewModel();

    await act(() => result.current.actions.edit('dumbbell'));
    await act(() => result.current.actions.type('2,555'));
    await act(() => result.current.actions.save());

    expect(result.current.editing).toMatchObject({ error: true });
    expect(profiles.profile?.loadIncrementsKg.dumbbell).toBe(2);
  });

  it('error: a failed read, and retry reads again', async () => {
    const { result, profiles } = await renderViewModel();

    await act(() => profiles.fail());
    expect(result.current.state).toEqual({ status: 'error' });

    await act(() => result.current.actions.retry());
    expect(result.current.state.status).toBe('content');
  });
});
