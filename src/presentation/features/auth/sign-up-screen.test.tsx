import { render, screen, userEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { AuthOutcome } from '@/domain/repositories/auth-gateway';
import {
  FakeAuthGateway,
  InMemoryAccountRepository,
} from '@/domain/testing/in-memory-repositories';
import type { ContinueAfterAuth } from '@/domain/usecases/continue-after-auth';
import { SignUp } from '@/domain/usecases/sign-up';
import { SignUpScreen } from '@/presentation/features/auth/sign-up-screen';
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

async function renderScreen(outcome: AuthOutcome = { status: 'signedIn', userId: 'u1' }) {
  const useCases = someUseCases({
    signUp: new SignUp(new FakeAuthGateway(outcome), new InMemoryAccountRepository()),
    continueAfterAuth: { execute: async () => {} } as unknown as ContinueAfterAuth,
  });
  const callbacks = { onBack: jest.fn(), onDone: jest.fn(), onSignIn: jest.fn() };
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <AppStoreProvider store={createAppStore()}>
        <UseCasesProvider useCases={useCases}>
          <SignUpScreen {...callbacks} />
        </UseCasesProvider>
      </AppStoreProvider>
    </SafeAreaProvider>,
  );
  return callbacks;
}

async function typeCredentials(email: string, password: string) {
  await userEvent.type(screen.getByLabelText(auth.form.emailLabel), email);
  await userEvent.type(screen.getByLabelText(auth.form.passwordLabel), password);
}

const submit = () => screen.getByRole('button', { name: auth.form.signUp });

describe('SignUpScreen (S03)', () => {
  it('editing: explains the account and asks for the two fields', async () => {
    await renderScreen();

    expect(screen.getByRole('header', { name: auth.form.signUp })).toBeOnTheScreen();
    expect(screen.getByText(auth.form.signUpBody)).toBeOnTheScreen();
    expect(screen.getByText(auth.form.passwordHelp)).toBeOnTheScreen();
    expect(submit()).toBeDisabled();
  });

  it('AC1: creating the account leaves the screen', async () => {
    const { onDone } = await renderScreen();
    await typeCredentials('ana@mail.com', 'contraseña-larga');

    await userEvent.press(submit());

    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('AC2: the problems appear next to each field', async () => {
    const { onDone } = await renderScreen();
    await typeCredentials('ana', '123');

    await userEvent.press(submit());

    expect(screen.getByText(auth.form.emailInvalid)).toBeOnTheScreen();
    expect(screen.getByText(auth.form.passwordTooShort)).toBeOnTheScreen();
    expect(onDone).not.toHaveBeenCalled();
  });

  it('AC3: a taken email offers to sign in with it already filled in', async () => {
    const { onSignIn } = await renderScreen({ status: 'emailTaken' });
    await typeCredentials('ana@mail.com', 'contraseña-larga');

    await userEvent.press(submit());

    expect(screen.getByText(auth.errors.emailTaken)).toBeOnTheScreen();
    await userEvent.press(screen.getByRole('button', { name: auth.errors.emailTakenAction }));
    expect(onSignIn).toHaveBeenCalledWith('ana@mail.com');
  });

  it('AC5: an email of a Google account points to Google', async () => {
    await renderScreen({ status: 'useGoogle' });
    await typeCredentials('ana@mail.com', 'contraseña-larga');

    await userEvent.press(submit());

    expect(screen.getByText(auth.errors.useGoogle)).toBeOnTheScreen();
  });

  it('AC4: without a connection the message appears and the form keeps what was typed', async () => {
    await renderScreen({ status: 'offline' });
    await typeCredentials('ana@mail.com', 'contraseña-larga');

    await userEvent.press(submit());

    expect(screen.getByText(auth.errors.offline(auth.errors.actions.signUp))).toBeOnTheScreen();
    expect(screen.getByLabelText(auth.form.emailLabel)).toHaveDisplayValue('ana@mail.com');
  });

  it('«Ya tengo cuenta» opens sign-in', async () => {
    const { onSignIn } = await renderScreen();

    await userEvent.press(screen.getByRole('button', { name: auth.form.haveAccount }));

    expect(onSignIn).toHaveBeenCalledWith();
  });
});
