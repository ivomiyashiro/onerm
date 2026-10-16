import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import type { DataOwner } from '@/domain/models/data-owner';
import type { GoogleOutcome } from '@/domain/repositories/auth-gateway';
import {
  FakeAuthGateway,
  InMemoryAccountRepository,
  InMemoryProfileRepository,
} from '@/domain/testing/in-memory-repositories';
import { ContinueAfterAuth } from '@/domain/usecases/continue-after-auth';
import { ContinueWithGoogle } from '@/domain/usecases/continue-with-google';
import { useGoogleSignInViewModel } from '@/presentation/features/auth/use-google-sign-in-view-model';
import { createAppStore } from '@/presentation/state/app-store';
import { AppStoreProvider } from '@/presentation/state/app-store-context';
import { auth } from '@/presentation/strings/auth';
import { restoredSyncState, someUseCases } from '@/presentation/use-cases/testing';
import { UseCasesProvider } from '@/presentation/use-cases/use-cases-context';

async function setup(
  outcome: GoogleOutcome = { status: 'signedIn', userId: 'u1', email: 'ana@gmail.com' },
  owner: DataOwner = { kind: 'guest' },
) {
  const gateway = new FakeAuthGateway();
  gateway.googleOutcome = outcome;
  const account = new InMemoryAccountRepository(owner);
  const steps: unknown[] = [];
  const store = createAppStore();
  const useCases = someUseCases({
    continueWithGoogle: new ContinueWithGoogle(gateway, account),
    continueAfterAuth: new ContinueAfterAuth(
      new InMemoryProfileRepository(null),
      {
        saveStep: async (s) => void steps.push(s),
      },
      restoredSyncState,
    ),
  });
  const hook = await renderHook(() => useGoogleSignInViewModel(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <AppStoreProvider store={store}>
        <UseCasesProvider useCases={useCases}>{children}</UseCasesProvider>
      </AppStoreProvider>
    ),
  });
  return { ...hook, store, gateway, steps };
}

describe('useGoogleSignInViewModel (RF-AUTH-04)', () => {
  it('idle: nothing happened yet', async () => {
    const { result } = await setup();

    expect(result.current.state).toEqual({ status: 'idle', message: null });
  });

  it('AC1, AC2: signed in on a guest device: the store stays a guest and the onboarding goes on', async () => {
    const { result, store, steps } = await setup();

    await act(async () => result.current.actions.start());

    expect(result.current.state.status).toBe('done');
    expect(store.getState().account).toEqual({ kind: 'guest' });
    expect(steps.length).toBeGreaterThan(0);
  });

  it('the account whose data is here comes back in, with its email', async () => {
    const { result, store } = await setup(undefined, { kind: 'user', userId: 'u1' });

    await act(async () => result.current.actions.start());

    expect(store.getState().account).toEqual({
      kind: 'user',
      userId: 'u1',
      email: 'ana@gmail.com',
      sessionExpired: false,
    });
  });

  it('AC3: the email of a password account says to use the password', async () => {
    const { result } = await setup({ status: 'useYourPassword' });

    await act(async () => result.current.actions.start());

    expect(result.current.state).toEqual({
      status: 'idle',
      message: auth.errors.useYourPassword,
    });
  });

  it('AC4: cancelling says nothing', async () => {
    const { result } = await setup({ status: 'cancelled' });

    await act(async () => result.current.actions.start());

    expect(result.current.state).toEqual({ status: 'idle', message: null });
  });

  it.each([
    [{ status: 'offline' } as const, auth.errors.offline(auth.errors.actions.google)],
    [{ status: 'failed' } as const, auth.errors.unexpected],
  ])('«%j» says so', async (outcome, message) => {
    const { result } = await setup(outcome);

    await act(async () => result.current.actions.start());

    expect(result.current.state).toEqual({ status: 'idle', message });
  });

  it('RN-AUTH-07: the data of another account says to sign out first', async () => {
    const { result, store } = await setup(undefined, { kind: 'user', userId: 'someone-else' });

    await act(async () => result.current.actions.start());

    expect(result.current.state).toEqual({ status: 'idle', message: auth.errors.otherAccount });
    expect(store.getState().account).toEqual({ kind: 'guest' });
  });
});
