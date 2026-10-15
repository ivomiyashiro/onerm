import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import type { AccountState } from '@/domain/models/account';
import { PrepareLocalData } from '@/domain/usecases/prepare-local-data';
import type { ReadAccount } from '@/domain/usecases/read-account';
import { useStartupViewModel } from '@/presentation/features/startup/use-startup-view-model';
import { createAppStore } from '@/presentation/state/app-store';
import { AppStoreProvider } from '@/presentation/state/app-store-context';
import { UseCasesProvider } from '@/presentation/use-cases/use-cases-context';
import { someUseCases } from '@/presentation/use-cases/testing';

/** Fake database: the test decides when the preparation ends and how. */
function fakeDatabase() {
  const pending: { resolve(): void; reject(error: Error): void }[] = [];
  const prepare = jest.fn(
    () => new Promise<void>((resolve, reject) => pending.push({ resolve, reject })),
  );
  return {
    database: { prepare },
    prepare,
    succeed: () => act(async () => pending.shift()?.resolve()),
    fail: () => act(async () => pending.shift()?.reject(new Error('migration 0001 failed'))),
  };
}

async function renderViewModel(
  database: { prepare(): Promise<void> },
  account?: AccountState | 'fails',
) {
  const store = createAppStore();
  const useCases = someUseCases({
    prepareLocalData: new PrepareLocalData(database),
    ...(account !== undefined && {
      readAccount: {
        execute: async () => {
          if (account === 'fails') throw new Error('unreadable');
          return account;
        },
      } as unknown as ReadAccount,
    }),
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <AppStoreProvider store={store}>
      <UseCasesProvider useCases={useCases}>{children}</UseCasesProvider>
    </AppStoreProvider>
  );
  return { ...(await renderHook(() => useStartupViewModel(), { wrapper })), store };
}

describe('useStartupViewModel (07 §6)', () => {
  it('prepares the local data once, on mount', async () => {
    const fake = fakeDatabase();

    const { result } = await renderViewModel(fake.database);

    expect(result.current.state).toEqual({ status: 'preparing' });
    expect(fake.prepare).toHaveBeenCalledTimes(1);
  });

  it('is ready when the migrations end', async () => {
    const fake = fakeDatabase();
    const { result } = await renderViewModel(fake.database);

    await fake.succeed();

    expect(result.current.state).toEqual({ status: 'ready' });
  });

  it('shows the error when a migration fails', async () => {
    const fake = fakeDatabase();
    const { result } = await renderViewModel(fake.database);

    await fake.fail();

    expect(result.current.state).toEqual({ status: 'error' });
  });

  it('retry prepares again and ends ready', async () => {
    const fake = fakeDatabase();
    const { result } = await renderViewModel(fake.database);
    await fake.fail();

    await act(async () => result.current.actions.retry());

    expect(result.current.state).toEqual({ status: 'preparing' });
    expect(fake.prepare).toHaveBeenCalledTimes(2);
    await fake.succeed();
    expect(result.current.state).toEqual({ status: 'ready' });
  });

  it('RF-AUTH-06.AC1: the account is read before the app shows, and kept in the store', async () => {
    const fake = fakeDatabase();
    const user = {
      kind: 'user',
      userId: 'u1',
      email: 'ana@mail.com',
      sessionExpired: false,
    } as const;
    const { result, store } = await renderViewModel(fake.database, user);

    await fake.succeed();

    expect(result.current.state).toEqual({ status: 'ready' });
    expect(store.getState().account).toEqual(user);
  });

  it("an unreadable account does not block the app: it opens as a guest's", async () => {
    const fake = fakeDatabase();
    const { result, store } = await renderViewModel(fake.database, 'fails');

    await fake.succeed();

    expect(result.current.state).toEqual({ status: 'ready' });
    expect(store.getState().account).toEqual({ kind: 'guest' });
  });
});
