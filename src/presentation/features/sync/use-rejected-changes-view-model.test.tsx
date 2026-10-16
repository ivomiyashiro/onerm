import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import type { RejectedChange } from '@/domain/models/rejected-change';
import { useRejectedChangesViewModel } from '@/presentation/features/sync/use-rejected-changes-view-model';
import { rejectedChangesOver, someUseCases } from '@/presentation/use-cases/testing';
import { UseCasesProvider } from '@/presentation/use-cases/use-cases-context';

const ROUTINE: RejectedChange = {
  kind: 'routine',
  id: 'r1',
  reason: '23514',
  name: 'Fuerza',
  uploadedBefore: false,
  dependents: 2,
};

async function renderViewModel(
  changes: RejectedChange[],
  discardResult: 'done' | 'offline' = 'done',
) {
  const rejected = rejectedChangesOver(changes, discardResult);
  const hook = await renderHook(() => useRejectedChangesViewModel(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <UseCasesProvider useCases={someUseCases(rejected)}>{children}</UseCasesProvider>
    ),
  });
  return { ...hook, calls: rejected.calls };
}

describe('useRejectedChangesViewModel (S25, RF-SYNC-06.AC4)', () => {
  it('content: the rejected changes', async () => {
    const { result } = await renderViewModel([ROUTINE]);

    expect(result.current.state).toEqual({ status: 'content', changes: [ROUTINE] });
  });

  it('empty: «Todo respaldado»', async () => {
    const { result } = await renderViewModel([]);

    expect(result.current.state).toEqual({ status: 'empty' });
  });

  it('opening a change shows D12, and «Cerrar» closes it', async () => {
    const { result } = await renderViewModel([ROUTINE]);

    await act(async () => result.current.actions.open(ROUTINE));
    expect(result.current.dialog).toEqual({ change: ROUTINE, offline: false });

    await act(async () => result.current.actions.close());
    expect(result.current.dialog).toBeNull();
  });

  it('«Descartar este cambio» discards it and closes D12', async () => {
    const { result, calls } = await renderViewModel([ROUTINE]);
    await act(async () => result.current.actions.open(ROUTINE));

    await act(() => result.current.actions.discard());

    expect(calls.discarded).toEqual(['r1']);
    expect(result.current.dialog).toBeNull();
  });

  it('without connection, D12 stays and says it needs it', async () => {
    const uploaded = { ...ROUTINE, uploadedBefore: true };
    const { result } = await renderViewModel([uploaded], 'offline');
    await act(async () => result.current.actions.open(uploaded));

    await act(() => result.current.actions.discard());

    expect(result.current.dialog).toEqual({ change: uploaded, offline: true });
  });

  it('«Reintentar» retries it and closes D12', async () => {
    const { result, calls } = await renderViewModel([ROUTINE]);
    await act(async () => result.current.actions.open(ROUTINE));

    await act(() => result.current.actions.retry());

    expect(calls.retried).toEqual(['r1']);
    expect(result.current.dialog).toBeNull();
  });
});
