import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import type { DataOwner } from '@/domain/models/data-owner';
import type { AuthOutcome } from '@/domain/repositories/auth-gateway';
import {
  FakeAuthGateway,
  InMemoryAccountRepository,
  InMemoryProfileRepository,
} from '@/domain/testing/in-memory-repositories';
import { ContinueAfterAuth } from '@/domain/usecases/continue-after-auth';
import { SignUp } from '@/domain/usecases/sign-up';
import { useSignUpViewModel } from '@/presentation/features/auth/use-sign-up-view-model';
import { auth } from '@/presentation/strings/auth';
import { createAppStore } from '@/presentation/state/app-store';
import { AppStoreProvider } from '@/presentation/state/app-store-context';
import { someUseCases } from '@/presentation/use-cases/testing';
import { UseCasesProvider } from '@/presentation/use-cases/use-cases-context';

async function setup(
  outcome: AuthOutcome = { status: 'signedIn', userId: 'u1' },
  owner: DataOwner = { kind: 'guest' },
) {
  const gateway = new FakeAuthGateway(outcome);
  const account = new InMemoryAccountRepository(owner);
  const profiles = new InMemoryProfileRepository(null);
  const store = createAppStore();
  const useCases = someUseCases({
    signUp: new SignUp(gateway, account),
    continueAfterAuth: new ContinueAfterAuth(profiles, { saveStep: async () => {} }),
  });
  const hook = await renderHook(() => useSignUpViewModel(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <AppStoreProvider store={store}>
        <UseCasesProvider useCases={useCases}>{children}</UseCasesProvider>
      </AppStoreProvider>
    ),
  });
  return { ...hook, store, gateway, account };
}

type Hook = { current: ReturnType<typeof useSignUpViewModel> };

async function fill(result: Hook, email: string, password: string) {
  await act(async () => result.current.actions.setEmail(email));
  await act(async () => result.current.actions.setPassword(password));
}

describe('useSignUpViewModel (S03, RF-AUTH-02)', () => {
  it('AC1: done after creating the account', async () => {
    const { result, account } = await setup();
    await fill(result, 'ana@mail.com', 'contraseña-larga');

    await act(() => result.current.actions.submit());

    expect(result.current.state.status).toBe('done');
    expect(account.owner).toEqual({ kind: 'user', userId: 'u1' });
  });

  it('AC2: each field shows its own problem and nothing is sent', async () => {
    const { result, gateway } = await setup();
    await fill(result, 'ana', '123');

    await act(() => result.current.actions.submit());

    expect(result.current.state).toMatchObject({
      status: 'editing',
      emailError: auth.form.emailInvalid,
      passwordError: auth.form.passwordTooShort,
    });
    expect(gateway.requests).toEqual([]);
  });

  it("AC2: typing again clears that field's error", async () => {
    const { result } = await setup();
    await fill(result, 'ana', '123');
    await act(() => result.current.actions.submit());

    await act(async () => result.current.actions.setEmail('ana@mail.com'));

    expect(result.current.state.emailError).toBeNull();
    expect(result.current.state.passwordError).toBe(auth.form.passwordTooShort);
  });

  it('AC3: a taken email says so and offers to sign in', async () => {
    const { result } = await setup({ status: 'emailTaken' });
    await fill(result, 'ana@mail.com', 'contraseña-larga');

    await act(() => result.current.actions.submit());

    expect(result.current.state).toMatchObject({
      message: auth.errors.emailTaken,
      emailTaken: true,
      email: 'ana@mail.com',
    });
  });

  it('AC5 (RN-AUTH-03): an email of a Google account points to Google', async () => {
    const { result } = await setup({ status: 'useGoogle' });
    await fill(result, 'ana@mail.com', 'contraseña-larga');

    await act(() => result.current.actions.submit());

    expect(result.current.state).toMatchObject({
      message: auth.errors.useGoogle,
      emailTaken: false,
    });
  });

  it('AC4: without a connection what was typed is kept', async () => {
    const { result } = await setup({ status: 'offline' });
    await fill(result, 'ana@mail.com', 'contraseña-larga');

    await act(() => result.current.actions.submit());

    expect(result.current.state).toMatchObject({
      status: 'editing',
      message: auth.errors.offline(auth.errors.actions.signUp),
      email: 'ana@mail.com',
      password: 'contraseña-larga',
    });
  });

  it("RN-AUTH-07: a device with another account's data cannot create one", async () => {
    const { result } = await setup(undefined, { kind: 'user', userId: 'a' });
    await fill(result, 'ana@mail.com', 'contraseña-larga');

    await act(() => result.current.actions.submit());

    expect(result.current.state.message).toBe(auth.errors.otherAccount);
  });
});
