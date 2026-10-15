import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import type { DataOwner } from '@/domain/models/data-owner';
import type { RecoveryLinkOutcome } from '@/domain/repositories/auth-gateway';
import {
  FakeAuthGateway,
  InMemoryAccountRepository,
  InMemoryProfileRepository,
} from '@/domain/testing/in-memory-repositories';
import { CompletePasswordRecovery } from '@/domain/usecases/complete-password-recovery';
import { ContinueAfterAuth } from '@/domain/usecases/continue-after-auth';
import { OpenRecoveryLink } from '@/domain/usecases/open-recovery-link';
import { useNewPasswordViewModel } from '@/presentation/features/auth/use-new-password-view-model';
import { createAppStore } from '@/presentation/state/app-store';
import { AppStoreProvider } from '@/presentation/state/app-store-context';
import { auth } from '@/presentation/strings/auth';
import { someUseCases } from '@/presentation/use-cases/testing';
import { UseCasesProvider } from '@/presentation/use-cases/use-cases-context';

const LINK = 'onerm://new-password#access_token=a&refresh_token=r&type=recovery';

async function setup(
  link: RecoveryLinkOutcome = { status: 'opened', userId: 'u1', email: 'ana@mail.com' },
  url: string | null = LINK,
  owner: DataOwner = { kind: 'guest' },
) {
  const gateway = new FakeAuthGateway();
  gateway.linkOutcome = link;
  const account = new InMemoryAccountRepository(owner);
  const steps: unknown[] = [];
  const store = createAppStore();
  const useCases = someUseCases({
    openRecoveryLink: new OpenRecoveryLink(gateway, account),
    completePasswordRecovery: new CompletePasswordRecovery(gateway, account),
    continueAfterAuth: new ContinueAfterAuth(new InMemoryProfileRepository(null), {
      saveStep: async (s) => void steps.push(s),
    }),
  });
  const hook = await renderHook(({ url }: { url: string | null }) => useNewPasswordViewModel(url), {
    initialProps: { url },
    wrapper: ({ children }: { children: ReactNode }) => (
      <AppStoreProvider store={store}>
        <UseCasesProvider useCases={useCases}>{children}</UseCasesProvider>
      </AppStoreProvider>
    ),
  });
  return { ...hook, store, gateway, account, steps };
}

async function save(
  result: { current: ReturnType<typeof useNewPasswordViewModel> },
  password: string,
) {
  await act(async () => result.current.actions.setPassword(password));
  await act(async () => result.current.actions.submit());
}

describe('useNewPasswordViewModel (S24, RF-AUTH-08.AC2, AC3)', () => {
  it('checking: with no link yet nothing is asked of the server', async () => {
    const { result, gateway } = await setup(undefined, null);

    expect(result.current.state.status).toBe('checking');
    expect(gateway.openedLinks).toEqual([]);
  });

  it('AC2: a good link leaves the form ready', async () => {
    const { result } = await setup();

    await waitFor(() => expect(result.current.state.status).toBe('editing'));
    expect(result.current.state).toMatchObject({ password: '', canSubmit: false });
  });

  it('AC3: an expired or used link offers to ask for another one', async () => {
    const { result } = await setup({ status: 'invalidLink' });

    await waitFor(() => expect(result.current.state.status).toBe('invalidLink'));
  });

  it.each([
    [{ status: 'offline' } as const, auth.errors.offline(auth.errors.actions.resetPassword)],
    [{ status: 'failed' } as const, auth.errors.unexpected],
  ])('«%j» says so and cannot continue', async (link, message) => {
    const { result } = await setup(link);

    await waitFor(() => expect(result.current.state.status).toBe('unavailable'));
    expect(result.current.state.message).toBe(message);
  });

  it('RN-AUTH-07: the link of another account is refused', async () => {
    const { result } = await setup(undefined, LINK, { kind: 'user', userId: 'someone-else' });

    await waitFor(() => expect(result.current.state.status).toBe('unavailable'));
    expect(result.current.state.message).toBe(auth.errors.otherAccount);
  });

  it('AC2: the new password is saved; a guest device waits for the union (07 §4.3)', async () => {
    const { result, gateway, store, steps, account } = await setup();
    await waitFor(() => expect(result.current.state.status).toBe('editing'));

    await save(result, 'contraseña-nueva');

    expect(result.current.state.status).toBe('done');
    expect(gateway.newPasswords).toEqual(['contraseña-nueva']);
    expect(account.pendingMigration).toBe('u1');
    expect(store.getState().account).toEqual({ kind: 'guest' });
    expect(steps.length).toBeGreaterThan(0);
  });

  it('AC2: the account whose data is here is back in, with the email of the link', async () => {
    const { result, store } = await setup(undefined, LINK, { kind: 'user', userId: 'u1' });
    await waitFor(() => expect(result.current.state.status).toBe('editing'));

    await save(result, 'contraseña-nueva');

    expect(store.getState().account).toEqual({
      kind: 'user',
      userId: 'u1',
      email: 'ana@mail.com',
      sessionExpired: false,
    });
  });

  it('a short password says so next to the field and is not sent', async () => {
    const { result, gateway } = await setup();
    await waitFor(() => expect(result.current.state.status).toBe('editing'));

    await save(result, '123');

    expect(result.current.state).toMatchObject({
      status: 'editing',
      passwordError: auth.form.passwordTooShort,
    });
    expect(gateway.newPasswords).toEqual([]);
  });

  it('offline when saving keeps the form with what was typed', async () => {
    const { result, gateway } = await setup();
    await waitFor(() => expect(result.current.state.status).toBe('editing'));
    gateway.newPasswordOutcome = { status: 'offline' };

    await save(result, 'contraseña-nueva');

    expect(result.current.state).toMatchObject({
      status: 'editing',
      password: 'contraseña-nueva',
      message: auth.errors.offline(auth.errors.actions.resetPassword),
    });
  });

  it('leaving the form without saving closes the recovery session', async () => {
    const { result, gateway } = await setup();
    await waitFor(() => expect(result.current.state.status).toBe('editing'));

    await act(async () => result.current.actions.leave());

    expect(gateway.signedOut).toBe(1);
  });

  it('leaving without saving keeps the session the device already had in this account', async () => {
    const { result, gateway } = await setup(undefined, LINK, { kind: 'user', userId: 'u1' });
    await waitFor(() => expect(result.current.state.status).toBe('editing'));

    await act(async () => result.current.actions.leave());

    expect(gateway.signedOut).toBe(0);
  });

  it('a second link opens again, starting from checking', async () => {
    const { result, gateway, rerender } = await setup({ status: 'invalidLink' });
    await waitFor(() => expect(result.current.state.status).toBe('invalidLink'));
    gateway.linkOutcome = { status: 'opened', userId: 'u1', email: 'ana@mail.com' };

    await rerender({ url: `${LINK}&second=1` });

    await waitFor(() => expect(result.current.state.status).toBe('editing'));
    expect(gateway.openedLinks).toHaveLength(2);
  });

  it('leaving after saving does not sign out', async () => {
    const { result, gateway } = await setup();
    await waitFor(() => expect(result.current.state.status).toBe('editing'));
    await save(result, 'contraseña-nueva');

    await act(async () => result.current.actions.leave());

    expect(gateway.signedOut).toBe(0);
  });
});
