import { render, screen, userEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { AuthOutcome } from '@/domain/repositories/auth-gateway';
import {
  FakeAuthGateway,
  InMemoryAccountRepository,
} from '@/domain/testing/in-memory-repositories';
import { ContinueAfterAuth } from '@/domain/usecases/continue-after-auth';
import { SignIn } from '@/domain/usecases/sign-in';
import { SignInScreen } from '@/presentation/features/auth/sign-in-screen';
import { auth } from '@/presentation/strings/auth';
import { createAppStore } from '@/presentation/state/app-store';
import { AppStoreProvider } from '@/presentation/state/app-store-context';
import { someUseCases } from '@/presentation/use-cases/testing';
import { UseCasesProvider } from '@/presentation/use-cases/use-cases-context';

jest.useFakeTimers();

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 54, left: 0, right: 0, bottom: 34 },
};

async function renderScreen(
  outcome: AuthOutcome = { status: 'signedIn', userId: 'u1' },
  initialEmail?: string,
) {
  const gateway = new FakeAuthGateway(outcome);
  const useCases = someUseCases({
    signIn: new SignIn(gateway, new InMemoryAccountRepository()),
    continueAfterAuth: { execute: async () => {} } as unknown as ContinueAfterAuth,
  });
  const callbacks = {
    onBack: jest.fn(),
    onDone: jest.fn(),
    onSignUp: jest.fn(),
    onForgotPassword: jest.fn(),
  };
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <AppStoreProvider store={createAppStore()}>
        <UseCasesProvider useCases={useCases}>
          <SignInScreen initialEmail={initialEmail} {...callbacks} />
        </UseCasesProvider>
      </AppStoreProvider>
    </SafeAreaProvider>,
  );
  return { ...callbacks, gateway };
}

async function typeCredentials(email: string, password: string) {
  await userEvent.type(screen.getByLabelText(auth.form.emailLabel), email);
  await userEvent.type(screen.getByLabelText(auth.form.passwordLabel), password);
}

const submit = () => screen.getByRole('button', { name: auth.form.signIn });

describe('SignInScreen (S02)', () => {
  it('editing: the form with its two fields and the way to sign up', async () => {
    await renderScreen();

    expect(screen.getByRole('header', { name: auth.form.signIn })).toBeOnTheScreen();
    expect(screen.getByLabelText(auth.form.emailLabel)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: auth.form.noAccount })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: auth.form.forgotPassword })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: auth.form.continueWithGoogle })).toBeOnTheScreen();
  });

  it('the button is disabled until there is an email and a password', async () => {
    await renderScreen();
    expect(submit()).toBeDisabled();

    await typeCredentials('ana@mail.com', 'x');

    expect(submit()).toBeEnabled();
  });

  it('RF-AUTH-02.AC3: the email S03 passes comes filled in', async () => {
    await renderScreen(undefined, 'ana@mail.com');

    expect(screen.getByLabelText(auth.form.emailLabel)).toHaveDisplayValue('ana@mail.com');
  });

  it('AC1: signing in leaves the screen', async () => {
    const { onDone } = await renderScreen();
    await typeCredentials('ana@mail.com', 'x');

    await userEvent.press(submit());

    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('AC2: wrong credentials show the message and keep the form', async () => {
    const { onDone } = await renderScreen({ status: 'wrongCredentials' });
    await typeCredentials('ana@mail.com', 'x');

    await userEvent.press(submit());

    expect(screen.getByText(auth.errors.wrongCredentials)).toBeOnTheScreen();
    expect(screen.getByLabelText(auth.form.emailLabel)).toHaveDisplayValue('ana@mail.com');
    expect(onDone).not.toHaveBeenCalled();
  });

  it('AC3: without a connection it asks for one and the person can go back as a guest', async () => {
    const { onBack } = await renderScreen({ status: 'offline' });
    await typeCredentials('ana@mail.com', 'x');

    await userEvent.press(submit());

    expect(screen.getByText(auth.errors.offline(auth.errors.actions.signIn))).toBeOnTheScreen();
    await userEvent.press(screen.getByRole('button', { name: 'Atrás' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('an email without domain is flagged next to the field', async () => {
    await renderScreen();
    await typeCredentials('ana@mail', 'x');

    await userEvent.press(submit());

    expect(screen.getByText(auth.form.emailMissingDomain)).toBeOnTheScreen();
  });

  it('the links open sign-up and the password recovery', async () => {
    const { onSignUp, onForgotPassword } = await renderScreen();

    await userEvent.press(screen.getByRole('button', { name: auth.form.noAccount }));
    await userEvent.press(screen.getByRole('button', { name: auth.form.forgotPassword }));

    expect(onSignUp).toHaveBeenCalledTimes(1);
    expect(onForgotPassword).toHaveBeenCalledWith('');
  });

  it('RF-AUTH-08: the email typed travels to the password recovery', async () => {
    const { onForgotPassword } = await renderScreen();
    await userEvent.type(screen.getByLabelText(auth.form.emailLabel), ' ana@mail.com ');

    await userEvent.press(screen.getByRole('button', { name: auth.form.forgotPassword }));

    expect(onForgotPassword).toHaveBeenCalledWith('ana@mail.com');
  });
});
