import { render, screen, userEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { PasswordResetOutcome } from '@/domain/repositories/auth-gateway';
import { FakeAuthGateway } from '@/domain/testing/in-memory-repositories';
import { RequestPasswordReset } from '@/domain/usecases/request-password-reset';
import { PasswordRecoveryScreen } from '@/presentation/features/auth/password-recovery-screen';
import { auth } from '@/presentation/strings/auth';
import { someUseCases } from '@/presentation/use-cases/testing';
import { UseCasesProvider } from '@/presentation/use-cases/use-cases-context';

jest.useFakeTimers();

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 54, left: 0, right: 0, bottom: 34 },
};

async function renderScreen(outcome: PasswordResetOutcome = 'sent', initialEmail?: string) {
  const gateway = new FakeAuthGateway();
  gateway.resetOutcome = outcome;
  const useCases = someUseCases({ requestPasswordReset: new RequestPasswordReset(gateway) });
  const callbacks = { onBack: jest.fn(), onBackToSignIn: jest.fn() };
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <UseCasesProvider useCases={useCases}>
        <PasswordRecoveryScreen initialEmail={initialEmail} {...callbacks} />
      </UseCasesProvider>
    </SafeAreaProvider>,
  );
  return { ...callbacks, gateway };
}

const send = () => screen.getByRole('button', { name: auth.recovery.send });

describe('PasswordRecoveryScreen (S04)', () => {
  it('editing: the explanation, the email and the button, disabled until there is an email', async () => {
    await renderScreen();

    expect(screen.getByRole('header', { name: auth.recovery.title })).toBeOnTheScreen();
    expect(screen.getByText(auth.recovery.body)).toBeOnTheScreen();
    expect(send()).toBeDisabled();

    await userEvent.type(screen.getByLabelText(auth.form.emailLabel), 'ana@mail.com');

    expect(send()).toBeEnabled();
  });

  it('the email typed in S02 comes filled in', async () => {
    await renderScreen('sent', 'ana@mail.com');

    expect(screen.getByLabelText(auth.form.emailLabel)).toHaveDisplayValue('ana@mail.com');
  });

  it('AC1: sent: «Revisá tu correo» with the same message whether the account exists or not', async () => {
    const { onBackToSignIn } = await renderScreen('sent', 'ana@mail.com');

    await userEvent.press(send());

    expect(screen.getByText(auth.recovery.checkEmail)).toBeOnTheScreen();
    expect(screen.getByText(auth.recovery.sentBody)).toBeOnTheScreen();
    expect(screen.getByText(auth.recovery.linkExpiryHelp)).toBeOnTheScreen();
    await userEvent.press(screen.getByRole('button', { name: auth.recovery.backToSignIn }));
    expect(onBackToSignIn).toHaveBeenCalledTimes(1);
  });

  it('error: an email without domain is flagged next to the field', async () => {
    await renderScreen('sent', 'ana@mail');

    await userEvent.press(send());

    expect(screen.getByText(auth.form.emailMissingDomain)).toBeOnTheScreen();
  });

  it('offline: asks for a connection and keeps the form', async () => {
    await renderScreen('offline', 'ana@mail.com');

    await userEvent.press(send());

    expect(
      screen.getByText(auth.errors.offline(auth.errors.actions.resetPassword)),
    ).toBeOnTheScreen();
    expect(screen.getByLabelText(auth.form.emailLabel)).toHaveDisplayValue('ana@mail.com');
  });
});
