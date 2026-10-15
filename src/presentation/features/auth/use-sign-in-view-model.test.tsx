import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import type { DataOwner } from '@/domain/models/data-owner';
import type { AuthOutcome } from '@/domain/repositories/auth-gateway';
import { defaultProfile } from '@/domain/rules/routine/default-profile';
import {
  FakeAuthGateway,
  InMemoryAccountRepository,
  InMemoryProfileRepository,
} from '@/domain/testing/in-memory-repositories';
import { ContinueAfterAuth } from '@/domain/usecases/continue-after-auth';
import { SignIn } from '@/domain/usecases/sign-in';
import { useSignInViewModel } from '@/presentation/features/auth/use-sign-in-view-model';
import { auth } from '@/presentation/strings/auth';
import { createAppStore } from '@/presentation/state/app-store';
import { AppStoreProvider } from '@/presentation/state/app-store-context';
import { someUseCases } from '@/presentation/use-cases/testing';
import { UseCasesProvider } from '@/presentation/use-cases/use-cases-context';

async function setup(
  outcome: AuthOutcome = { status: 'signedIn', userId: 'u1' },
  initialEmail?: string,
  owner: DataOwner = { kind: 'guest' },
) {
  const gateway = new FakeAuthGateway(outcome);
  const account = new InMemoryAccountRepository(owner);
  const profiles = new InMemoryProfileRepository(null);
  const steps: unknown[] = [];
  const store = createAppStore();
  const useCases = someUseCases({
    signIn: new SignIn(gateway, account),
    continueAfterAuth: new ContinueAfterAuth(profiles, {
      saveStep: async (s) => void steps.push(s),
    }),
  });
  const hook = await renderHook(() => useSignInViewModel(initialEmail), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <AppStoreProvider store={store}>
        <UseCasesProvider useCases={useCases}>{children}</UseCasesProvider>
      </AppStoreProvider>
    ),
  });
  return { ...hook, store, gateway, account, profiles, steps };
}

async function fill(
  result: { current: ReturnType<typeof useSignInViewModel> },
  email: string,
  password: string,
) {
  await act(async () => result.current.actions.setEmail(email));
  await act(async () => result.current.actions.setPassword(password));
}

describe('useSignInViewModel (S02, RF-AUTH-03)', () => {
  it('editing: the form starts empty, or with the email S03 passes', async () => {
    expect((await setup()).result.current.state).toMatchObject({
      status: 'editing',
      email: '',
      canSubmit: false,
    });
    expect((await setup(undefined, 'ana@mail.com')).result.current.state.email).toBe(
      'ana@mail.com',
    );
  });

  it('can only be sent with an email and a password', async () => {
    const { result } = await setup();

    await fill(result, 'ana@mail.com', '');
    expect(result.current.state.canSubmit).toBe(false);

    await fill(result, 'ana@mail.com', 'x');
    expect(result.current.state.canSubmit).toBe(true);
  });

  it('AC1: done after signing in, and the onboarding begins on a new device', async () => {
    const { result, account, profiles, steps, store } = await setup();
    await fill(result, 'ana@mail.com', 'x');

    await act(() => result.current.actions.submit());

    expect(result.current.state.status).toBe('done');
    // A guest device stays the guest's until the union (07 §4.3).
    expect(account.owner).toEqual({ kind: 'guest' });
    expect(profiles.profile).toEqual(defaultProfile());
    expect(steps).toEqual(['level']);
    expect(store.getState().account).toEqual({ kind: 'guest' });
  });

  it('RF-AUTH-06.AC4: the account whose data is here comes back in, and the store says so', async () => {
    const { result, store } = await setup(undefined, undefined, { kind: 'user', userId: 'u1' });
    await fill(result, 'ana@mail.com', 'x');

    await act(() => result.current.actions.submit());

    expect(store.getState().account).toEqual({
      kind: 'user',
      userId: 'u1',
      email: 'ana@mail.com',
      sessionExpired: false,
    });
  });

  it('shows the email problem next to the field and sends nothing', async () => {
    const { result, gateway } = await setup();
    await fill(result, 'ana@mail', 'x');

    await act(() => result.current.actions.submit());

    expect(result.current.state).toMatchObject({
      status: 'editing',
      emailError: auth.form.emailMissingDomain,
    });
    expect(gateway.requests).toEqual([]);
  });

  it.each([
    ['AC2', { status: 'wrongCredentials' }, auth.errors.wrongCredentials],
    ['AC3', { status: 'offline' }, auth.errors.offline(auth.errors.actions.signIn)],
    ['unexpected', { status: 'failed' }, auth.errors.unexpected],
  ] as const)('%s: the message appears and what was typed stays', async (_ac, outcome, message) => {
    const { result } = await setup(outcome);
    await fill(result, 'ana@mail.com', 'secreta');

    await act(() => result.current.actions.submit());

    expect(result.current.state).toMatchObject({
      status: 'editing',
      message,
      email: 'ana@mail.com',
      password: 'secreta',
    });
  });

  it('RN-AUTH-07: another account is refused with its message', async () => {
    const { result, account } = await setup({ status: 'signedIn', userId: 'b' }, undefined, {
      kind: 'user',
      userId: 'a',
    });
    await fill(result, 'otra@mail.com', 'x');

    await act(() => result.current.actions.submit());

    expect(result.current.state).toMatchObject({
      status: 'editing',
      message: auth.errors.otherAccount,
    });
    expect(account.owner).toEqual({ kind: 'user', userId: 'a' });
  });

  it('shows and hides the password', async () => {
    const { result } = await setup();

    await act(async () => result.current.actions.toggleShowPassword());
    expect(result.current.state.showPassword).toBe(true);

    await act(async () => result.current.actions.toggleShowPassword());
    expect(result.current.state.showPassword).toBe(false);
  });

  it('sends only once when it is tapped twice in the same frame', async () => {
    const { result, gateway } = await setup();
    await fill(result, 'ana@mail.com', 'x');

    await act(async () => {
      void result.current.actions.submit();
      void result.current.actions.submit();
    });

    expect(gateway.requests).toHaveLength(1);
  });
});
