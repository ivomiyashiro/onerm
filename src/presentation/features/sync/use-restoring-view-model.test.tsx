import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { ContinueAfterAuth } from '@/domain/usecases/continue-after-auth';
import { ObserveRestoration, type Restoration } from '@/domain/usecases/observe-restoration';
import { useRestoringViewModel } from '@/presentation/features/sync/use-restoring-view-model';
import { someUseCases } from '@/presentation/use-cases/testing';
import { UseCasesProvider } from '@/presentation/use-cases/use-cases-context';

async function renderViewModel(restoration: Restoration) {
  const calls: { evenIfRestoring: boolean }[] = [];
  const continueAfterAuth = {
    execute: async (options?: { evenIfRestoring?: boolean }) =>
      void calls.push({ evenIfRestoring: options?.evenIfRestoring ?? false }),
  } as unknown as ContinueAfterAuth;
  const observeRestoration = {
    execute: (listener: (r: Restoration) => void) => (listener(restoration), () => {}),
  } as unknown as ObserveRestoration;
  const hook = await renderHook(() => useRestoringViewModel(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <UseCasesProvider useCases={someUseCases({ continueAfterAuth, observeRestoration })}>
        {children}
      </UseCasesProvider>
    ),
  });
  return { ...hook, calls };
}

describe('useRestoringViewModel (S23, RF-SYNC-03)', () => {
  it('AC1: the progress of the restoration', async () => {
    const progress: Restoration = { status: 'restoring', done: 30, total: 120, percent: 25 };
    const { result } = await renderViewModel(progress);

    expect(result.current.state).toEqual(progress);
  });

  it('AC3: once finished it goes on: the onboarding only if the account had no profile', async () => {
    const { calls } = await renderViewModel({ status: 'finished' });

    expect(calls).toEqual([{ evenIfRestoring: false }]);
  });

  it('AC2: interrupted, «Continuar» goes on with what arrived', async () => {
    const { result, calls } = await renderViewModel({ status: 'interrupted' });
    expect(calls).toEqual([]);

    await act(() => result.current.actions.continue());

    expect(calls).toEqual([{ evenIfRestoring: true }]);
  });
});
