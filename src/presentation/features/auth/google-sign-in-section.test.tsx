import { render, screen, userEvent } from '@testing-library/react-native';

import type { GoogleOutcome } from '@/domain/repositories/auth-gateway';
import {
  FakeAuthGateway,
  InMemoryAccountRepository,
} from '@/domain/testing/in-memory-repositories';
import type { ContinueAfterAuth } from '@/domain/usecases/continue-after-auth';
import { ContinueWithGoogle } from '@/domain/usecases/continue-with-google';
import { GoogleSignInSection } from '@/presentation/features/auth/google-sign-in-section';
import { createAppStore } from '@/presentation/state/app-store';
import { AppStoreProvider } from '@/presentation/state/app-store-context';
import { auth } from '@/presentation/strings/auth';
import { someUseCases } from '@/presentation/use-cases/testing';
import { UseCasesProvider } from '@/presentation/use-cases/use-cases-context';

jest.useFakeTimers();

async function renderSection(
  outcome: GoogleOutcome = { status: 'signedIn', userId: 'u1', email: 'ana@gmail.com' },
  googleAvailable = true,
) {
  const gateway = new FakeAuthGateway();
  gateway.googleOutcome = outcome;
  gateway.googleAvailable = googleAvailable;
  const useCases = someUseCases({
    continueWithGoogle: new ContinueWithGoogle(gateway, new InMemoryAccountRepository()),
    continueAfterAuth: { execute: async () => {} } as unknown as ContinueAfterAuth,
  });
  const onDone = jest.fn();
  await render(
    <AppStoreProvider store={createAppStore()}>
      <UseCasesProvider useCases={useCases}>
        <GoogleSignInSection onDone={onDone} />
      </UseCasesProvider>
    </AppStoreProvider>,
  );
  return { onDone, gateway };
}

const google = () => screen.getByRole('button', { name: auth.form.continueWithGoogle });

describe('GoogleSignInSection (S02, S03)', () => {
  it('without a Google picker (iOS without its own client) the section is not shown (D2 of F9)', async () => {
    await renderSection(undefined, false);

    expect(screen.queryByRole('button', { name: auth.form.continueWithGoogle })).toBeNull();
    expect(screen.queryByText(auth.form.orWithEmail)).toBeNull();
  });

  it('idle: the button and the way to the email form', async () => {
    await renderSection();

    expect(google()).toBeEnabled();
    expect(screen.getByText(auth.form.orWithEmail)).toBeOnTheScreen();
  });

  it('AC1, AC2: signing in leaves the screen', async () => {
    const { onDone } = await renderSection();

    await userEvent.press(google());

    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('AC3: the email of a password account shows the message and stays', async () => {
    const { onDone } = await renderSection({ status: 'useYourPassword' });

    await userEvent.press(google());

    expect(screen.getByText(auth.errors.useYourPassword)).toBeOnTheScreen();
    expect(onDone).not.toHaveBeenCalled();
  });

  it('AC4: cancelling shows no message', async () => {
    const { onDone } = await renderSection({ status: 'cancelled' });

    await userEvent.press(google());

    expect(screen.queryByRole('alert')).not.toBeOnTheScreen();
    expect(screen.queryByText(auth.errors.unexpected)).not.toBeOnTheScreen();
    expect(onDone).not.toHaveBeenCalled();
  });

  it('AC5: without a connection it asks for one', async () => {
    await renderSection({ status: 'offline' });

    await userEvent.press(google());

    expect(screen.getByText(auth.errors.offline(auth.errors.actions.google))).toBeOnTheScreen();
  });
});
