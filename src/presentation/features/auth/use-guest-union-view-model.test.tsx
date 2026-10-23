import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import type { GuestSummary } from '@/domain/repositories/guest-union';
import {
  FakeAuthGateway,
  InMemoryAccountRepository,
} from '@/domain/testing/in-memory-repositories';
import { FinishGuestUnion, StartGuestUnion } from '@/domain/usecases/guest-union';
import { ObserveSyncActivity } from '@/domain/usecases/observe-sync-activity';
import { SyncNow } from '@/domain/usecases/sync-now';
import type { SyncActivity } from '@/domain/usecases/sync-scheduler';
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

/** A promise the test resolves when it wants, to see what shows while it waits. */
function deferred<T>() {
  let resolve: (value: T) => void = () => {};
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

/** A guest device waiting for the union with u1, over the given use cases. */
async function renderOver(overrides: Partial<ReturnType<typeof guestUnionOver>>) {
  const account = new InMemoryAccountRepository();
  account.pendingMigration = 'u1';
  const gateway = new FakeAuthGateway(undefined, { userId: 'u1', email: 'ana@mail.com' });
  return renderHook(() => useGuestUnionViewModel(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <AppStoreProvider store={createAppStore()}>
        <UseCasesProvider
          useCases={someUseCases({ ...guestUnionOver(account, gateway, SOME, true), ...overrides })}
        >
          {children}
        </UseCasesProvider>
      </AppStoreProvider>
    ),
  });
}

describe('useGuestUnionViewModel (RF-AUTH-05)', () => {
  it('AC7: nothing to ask: unites, the device is the account’s and syncs', async () => {
    const { result, store, union, syncs } = await renderViewModel(SOME, false);

    expect(result.current.checking).toBe(false);
    expect(result.current.dialog).toBeNull();
    expect(union.united).toEqual([{ userId: 'u1', keepGuestData: true }]);
    expect(store.getState().account).toEqual(USER);
    expect(syncs.asked).toBe(1);
  });

  it('while the account is checked, it says so instead of leaving the screen still', async () => {
    const check = deferred<boolean>();
    const { result } = await renderOver({
      startGuestUnion: new StartGuestUnion({
        guestSummary: async () => SOME,
        accountHasData: () => check.promise,
        unite: async () => 'done',
      }),
    });
    expect(result.current.checking).toBe(true);
    expect(result.current.dialog).toBeNull();

    await act(async () => check.resolve(true));

    expect(result.current.checking).toBe(false);
    expect(result.current.dialog).toEqual({
      kind: 'ask',
      summary: SOME,
      offline: false,
      working: null,
    });
  });

  it('a choice in progress shows on its button and a second tap does nothing', async () => {
    const unite = deferred<'done' | 'offline'>();
    let calls = 0;
    const { result } = await renderOver({
      finishGuestUnion: new FinishGuestUnion({
        unite: () => {
          calls++;
          return unite.promise;
        },
      }),
    });

    let merging: Promise<void> = Promise.resolve();
    await act(async () => {
      merging = result.current.actions.merge();
    });
    expect(result.current.dialog?.working).toBe('merge');
    await act(() => result.current.actions.merge());
    await act(async () => result.current.actions.discard());
    expect(calls).toBe(1);
    expect(result.current.dialog?.kind).toBe('ask');

    await act(async () => {
      unite.resolve('offline');
      await merging;
    });
    expect(result.current.dialog).toEqual({
      kind: 'ask',
      summary: SOME,
      offline: true,
      working: null,
    });
  });

  it('AC2: both have data: D01 with the guest counts', async () => {
    const { result, union } = await renderViewModel(SOME, true);

    expect(result.current.dialog).toEqual({ kind: 'ask', summary: SOME, offline: false, working: null });
    expect(union.united).toEqual([]);
  });

  it('without connection, D01 stays and says it needs it', async () => {
    const { result, store } = await renderViewModel(SOME, true, true, 'offline');

    await act(() => result.current.actions.merge());

    expect(result.current.dialog).toEqual({ kind: 'ask', summary: SOME, offline: true, working: null });
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
      working: null,
    });
    expect(union.united).toEqual([]);

    await act(async () => result.current.actions.back());
    expect(result.current.dialog).toEqual({ kind: 'ask', summary: SOME, offline: false, working: null });

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

    expect(result.current.dialog).toEqual({ kind: 'ask', summary: SOME, offline: false, working: null });
  });

  it('D3: a sync that ends with no union waiting asks nothing again', async () => {
    let asked = 0;
    const startGuestUnion = new StartGuestUnion({
      guestSummary: async () => {
        asked++;
        return SOME;
      },
      accountHasData: async () => false,
      unite: async () => 'done',
    });
    let emit: (activity: SyncActivity) => void = () => {};
    const observeSyncActivity = new ObserveSyncActivity({
      observeActivity: (listener) => {
        emit = listener;
        return () => {};
      },
    });
    const account = new InMemoryAccountRepository();
    account.pendingMigration = 'u1';
    const gateway = new FakeAuthGateway(undefined, { userId: 'u1', email: 'ana@mail.com' });
    await renderHook(() => useGuestUnionViewModel(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <AppStoreProvider store={createAppStore()}>
          <UseCasesProvider
            useCases={someUseCases({
              ...guestUnionOver(account, gateway),
              startGuestUnion,
              observeSyncActivity,
            })}
          >
            {children}
          </UseCasesProvider>
        </AppStoreProvider>
      ),
    });
    expect(asked).toBe(1);

    const idle = { lastResult: 'synced', online: true, restoring: null } as const;
    await act(async () => emit({ ...idle, running: true }));
    await act(async () => emit({ ...idle, running: false }));

    expect(asked).toBe(1);
  });

  it('D3: a union that found no connection retries when a sync ends (reconnection, foreground)', async () => {
    const account = new InMemoryAccountRepository();
    account.pendingMigration = 'u1';
    const gateway = new FakeAuthGateway(undefined, { userId: 'u1', email: 'ana@mail.com' });
    let online = false;
    const union = guestUnionOver(account, gateway, SOME, true);
    const startGuestUnion = new StartGuestUnion({
      guestSummary: async () => SOME,
      accountHasData: async () => (online ? true : 'offline'),
      unite: async () => 'done',
    });
    let emit: (activity: SyncActivity) => void = () => {};
    const observeSyncActivity = new ObserveSyncActivity({
      observeActivity: (listener) => {
        emit = listener;
        return () => {};
      },
    });
    const { result } = await renderHook(() => useGuestUnionViewModel(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <AppStoreProvider store={createAppStore()}>
          <UseCasesProvider
            useCases={someUseCases({ ...union, startGuestUnion, observeSyncActivity })}
          >
            {children}
          </UseCasesProvider>
        </AppStoreProvider>
      ),
    });
    expect(result.current.dialog).toBeNull();
    expect(result.current.checking).toBe(false);

    online = true;
    const idle = { lastResult: 'guest', online: true, restoring: null } as const;
    await act(async () => emit({ ...idle, running: true }));
    await act(async () => emit({ ...idle, running: false }));

    expect(result.current.dialog).toEqual({ kind: 'ask', summary: SOME, offline: false, working: null });
  });
});
