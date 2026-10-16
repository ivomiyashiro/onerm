import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { defaultProfile } from '@/domain/rules/routine/default-profile';
import {
  InMemoryOnboardingRepository,
  InMemoryProfileRepository,
  FixedSyncStateRepository,
} from '@/domain/testing/in-memory-repositories';
import { ObserveEntry } from '@/domain/usecases/observe-entry';
import { useEntryViewModel } from '@/presentation/features/entry/use-entry-view-model';
import { someUseCases } from '@/presentation/use-cases/testing';
import { UseCasesProvider } from '@/presentation/use-cases/use-cases-context';

async function renderViewModel(useCases = someUseCases()) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <UseCasesProvider useCases={useCases}>{children}</UseCasesProvider>
  );
  return renderHook(() => useEntryViewModel(), { wrapper });
}

function over(profiles: InMemoryProfileRepository) {
  return someUseCases({
    observeEntry: new ObserveEntry(
      profiles,
      new InMemoryOnboardingRepository('goal'),
      new FixedSyncStateRepository(),
    ),
  });
}

describe('useEntryViewModel', () => {
  it('is loading until the entry is known', async () => {
    const { result } = await renderViewModel();

    expect(result.current.state).toEqual({ status: 'loading' });
  });

  it('ready: where the app opens', async () => {
    const { result } = await renderViewModel(over(new InMemoryProfileRepository(defaultProfile())));

    expect(result.current.state).toMatchObject({
      status: 'ready',
      entry: { kind: 'onboarding', step: 'goal' },
    });
  });

  it('error: a failed read, and retry reads again', async () => {
    const profiles = new InMemoryProfileRepository(null);
    const { result } = await renderViewModel(over(profiles));

    await act(() => profiles.fail());
    expect(result.current.state).toEqual({ status: 'error' });

    await act(() => result.current.actions.retry());
    expect(result.current.state).toEqual({ status: 'ready', entry: { kind: 'welcome' } });
  });
});
