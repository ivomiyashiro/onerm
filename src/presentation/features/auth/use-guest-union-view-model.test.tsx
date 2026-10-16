import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import type { GuestSummary } from '@/domain/repositories/guest-union';
import {
  FakeAuthGateway,
  InMemoryAccountRepository,
} from '@/domain/testing/in-memory-repositories';
import { SyncNow } from '@/domain/usecases/sync-now';
import { useGuestUnionViewModel } from '@/presentation/features/auth/use-guest-union-view-model';
import { createAppStore } from '@/presentation/state/app-store';
import { AppStoreProvider } from '@/presentation/state/app-store-context';
import { guestUnionOver, someUseCases } from '@/presentation/use-cases/testing';
import { UseCasesProvider } from '@/presentation/use-cases/use-cases-context';

const SOME: GuestSummary = { workouts: 3, routines: 1, workoutInProgress: true };

/** A guest device waiting for the union with u1 (07 §4.3 step 0), with u1's session stored. */
async function renderViewModel(
  summary: GuestSummary,
  accountHasData: boolean,
  waiting = true,
  uniteResult: 'done' | 'offline' = 'done',
) {
  const account = new InMemoryAccountRepository();
  account.pendingMigration = waiting ? 'u1' : null;
  const gateway = new FakeAuthGateway(undefined, { userId: 'u1', email: 'ana@mail.com' });
  const union = guestUnionOver(account, gateway, summary, accountHasData, uniteResult);
  const syncs = { asked: 0 };
  const store = createAppStore();
  const useCases = someUseCases({
    ...union,
    syncNow: new SyncNow({
      syncNow: async () => {
        syncs.asked++;
        return 'synced';
      },
    }),
  });
  const hook = await renderHook(() => useGuestUnionViewModel(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <AppStoreProvider store={store}>
        <UseCasesProvider useCases={useCases}>{children}</UseCasesProvider>
      </AppStoreProvider>
    ),
  });
  return { ...hook, store, union, account, gateway, syncs };
}

const USER = { kind: 'user', userId: 'u1', email: 'ana@mail.com', sessionExpired: false };

describe('useGuestUnionViewModel (RF-AUTH-05)', () => {
  it('AC7: nothing to ask: unites, the device is the account’s and syncs', async () => {
    const { result, store, union, syncs } = await renderViewModel(SOME, false);

    expect(result.current.dialog).toBeNull();
    expect(union.united).toEqual([{ userId: 'u1', keepGuestData: true }]);
    expect(store.getState().account).toEqual(USER);
    expect(syncs.asked).toBe(1);
  });

  it('AC2: both have data: D01 with the guest counts', async () => {
    const { result, union } = await renderViewModel(SOME, true);

    expect(result.current.dialog).toEqual({ kind: 'ask', summary: SOME, offline: false });
    expect(union.united).toEqual([]);
  });

  it('without connection, D01 stays and says it needs it', async () => {
    const { result, store } = await renderViewModel(SOME, true, true, 'offline');

    await act(() => result.current.actions.merge());

    expect(result.current.dialog).toEqual({ kind: 'ask', summary: SOME, offline: true });
    expect(store.getState().account).toEqual({ kind: 'guest' });
  });

  it('AC3: «Sumar a mi cuenta» keeps the guest data', async () => {
    const { result, union, store } = await renderViewModel(SOME, true);

    await act(() => result.current.actions.merge());

    expect(union.united).toEqual([{ userId: 'u1', keepGuestData: true }]);
    expect(result.current.dialog).toBeNull();
    expect(store.getState().account).toEqual(USER);
  });

  it('AC4: «Descartar» asks to confirm (D01b) and only then deletes', async () => {
    const { result, union } = await renderViewModel(SOME, true);

    await act(async () => result.current.actions.discard());
    expect(result.current.dialog).toEqual({
      kind: 'confirmDiscard',
      summary: SOME,
      offline: false,
    });
    expect(union.united).toEqual([]);

    await act(async () => result.current.actions.back());
    expect(result.current.dialog).toEqual({ kind: 'ask', summary: SOME, offline: false });

    await act(async () => result.current.actions.discard());
    await act(() => result.current.actions.confirmDiscard());
    expect(union.united).toEqual([{ userId: 'u1', keepGuestData: false }]);
  });

  it('AC9: «Cancelar» closes the session and the device stays the guest’s', async () => {
    const { result, gateway, account, store } = await renderViewModel(SOME, true);

    await act(() => result.current.actions.cancel());

    expect(result.current.dialog).toBeNull();
    expect(gateway.signedOut).toBe(1);
    expect(account.pendingMigration).toBeNull();
    expect(store.getState().account).toEqual({ kind: 'guest' });
  });

  it('entering an account on a guest device asks for the union, which then runs', async () => {
    const { result, store, account } = await renderViewModel(SOME, true, false);
    expect(result.current.dialog).toBeNull();
    account.pendingMigration = 'u1';

    await act(async () => store.getState().requestUnion());

    expect(result.current.dialog).toEqual({ kind: 'ask', summary: SOME, offline: false });
  });
});
