import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { FakeAuthGateway } from '@/domain/testing/in-memory-repositories';
import { RequestPasswordReset } from '@/domain/usecases/request-password-reset';
import { usePasswordRecoveryViewModel } from '@/presentation/features/auth/use-password-recovery-view-model';
import { auth } from '@/presentation/strings/auth';
import { someUseCases } from '@/presentation/use-cases/testing';
import { UseCasesProvider } from '@/presentation/use-cases/use-cases-context';

async function setup(initialEmail?: string) {
  const gateway = new FakeAuthGateway();
  const useCases = someUseCases({ requestPasswordReset: new RequestPasswordReset(gateway) });
  const hook = await renderHook(() => usePasswordRecoveryViewModel(initialEmail), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <UseCasesProvider useCases={useCases}>{children}</UseCasesProvider>
    ),
  });
  return { ...hook, gateway };
}

async function request(
  result: { current: ReturnType<typeof usePasswordRecoveryViewModel> },
  email: string,
) {
  await act(async () => result.current.actions.setEmail(email));
  await act(async () => result.current.actions.submit());
}

describe('usePasswordRecoveryViewModel (S04, RF-AUTH-08.AC1)', () => {
  it('editing: starts with the email that came from S02, and cannot send while it is empty', async () => {
    const { result } = await setup('ana@mail.com');

    expect(result.current.state).toMatchObject({
      status: 'editing',
      email: 'ana@mail.com',
      canSubmit: true,
    });

    await act(async () => result.current.actions.setEmail(''));
    expect(result.current.state.canSubmit).toBe(false);
  });

  it('AC1: sent: the same answer whether the account exists or not', async () => {
    const { result, gateway } = await setup();

    await request(result, 'ana@mail.com');

    expect(result.current.state).toMatchObject({ status: 'sent', message: null });
    expect(gateway.resetRequests).toEqual(['ana@mail.com']);
  });

  it('an invalid email says what is wrong next to the field and is not sent', async () => {
    const { result, gateway } = await setup();

    await request(result, 'ana@mail');

    expect(result.current.state).toMatchObject({
      status: 'editing',
      emailError: auth.form.emailMissingDomain,
    });
    expect(gateway.resetRequests).toEqual([]);
  });

  it('offline: says a connection is needed and keeps what was typed', async () => {
    const { result, gateway } = await setup();
    gateway.resetOutcome = 'offline';

    await request(result, 'ana@mail.com');

    expect(result.current.state).toMatchObject({
      status: 'editing',
      email: 'ana@mail.com',
      message: auth.errors.offline(auth.errors.actions.resetPassword),
    });
  });

  it('failed: asks to try again', async () => {
    const { result, gateway } = await setup();
    gateway.resetOutcome = 'failed';

    await request(result, 'ana@mail.com');

    expect(result.current.state).toMatchObject({
      status: 'editing',
      message: auth.errors.unexpected,
    });
  });
});
