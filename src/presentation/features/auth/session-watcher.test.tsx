import { act, render } from '@testing-library/react-native';

import {
  FakeAuthGateway,
  InMemoryAccountRepository,
} from '@/domain/testing/in-memory-repositories';
import { ObserveSessionLoss } from '@/domain/usecases/observe-session-loss';
import { SessionWatcher } from '@/presentation/features/auth/session-watcher';
import { createAppStore } from '@/presentation/state/app-store';
import { AppStoreProvider } from '@/presentation/state/app-store-context';
import { someUseCases } from '@/presentation/use-cases/testing';
import { UseCasesProvider } from '@/presentation/use-cases/use-cases-context';

async function renderWatcher() {
  const gateway = new FakeAuthGateway();
  const account = new InMemoryAccountRepository({ kind: 'user', userId: 'u1' });
  const store = createAppStore();
  store.getState().setAccount({
    kind: 'user',
    userId: 'u1',
    email: 'ana@mail.com',
    sessionExpired: false,
  });
  await render(
    <AppStoreProvider store={store}>
      <UseCasesProvider
        useCases={someUseCases({ observeSessionLoss: new ObserveSessionLoss(gateway, account) })}
      >
        <SessionWatcher />
      </UseCasesProvider>
    </AppStoreProvider>,
  );
  return { gateway, store };
}

describe('SessionWatcher (RF-AUTH-06.AC4)', () => {
  it('marks the session as expired when the server ends it, keeping the account', async () => {
    const { gateway, store } = await renderWatcher();

    await act(async () => {
      gateway.loseSession();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(store.getState().account).toEqual({
      kind: 'user',
      userId: 'u1',
      email: 'ana@mail.com',
      sessionExpired: true,
    });
  });
});
