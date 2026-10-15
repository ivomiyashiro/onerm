import { render, screen, userEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { RecoveryLinkOutcome } from '@/domain/repositories/auth-gateway';
import {
  FakeAuthGateway,
  InMemoryAccountRepository,
} from '@/domain/testing/in-memory-repositories';
import { CompletePasswordRecovery } from '@/domain/usecases/complete-password-recovery';
import { OpenRecoveryLink } from '@/domain/usecases/open-recovery-link';
import { NewPasswordScreen } from '@/presentation/features/auth/new-password-screen';
import { createAppStore } from '@/presentation/state/app-store';
import { AppStoreProvider } from '@/presentation/state/app-store-context';
import { auth } from '@/presentation/strings/auth';
import { someUseCases } from '@/presentation/use-cases/testing';
import { UseCasesProvider } from '@/presentation/use-cases/use-cases-context';
import type { ContinueAfterAuth } from '@/domain/usecases/continue-after-auth';

jest.useFakeTimers();

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 54, left: 0, right: 0, bottom: 34 },
};
const LINK = 'onerm://new-password#access_token=a&refresh_token=r&type=recovery';

async function renderScreen(
  link: RecoveryLinkOutcome = { status: 'opened', userId: 'u1', email: 'ana@mail.com' },
  url: string | null = LINK,
) {
  const gateway = new FakeAuthGateway();
  gateway.linkOutcome = link;
  const account = new InMemoryAccountRepository();
  const useCases = someUseCases({
    openRecoveryLink: new OpenRecoveryLink(gateway, account),
    completePasswordRecovery: new CompletePasswordRecovery(gateway, account),
    continueAfterAuth: { execute: async () => {} } as unknown as ContinueAfterAuth,
  });
  const callbacks = { onBack: jest.fn(), onDone: jest.fn(), onRequestNewLink: jest.fn() };
  const view = await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <AppStoreProvider store={createAppStore()}>
        <UseCasesProvider useCases={useCases}>
          <NewPasswordScreen url={url} {...callbacks} />
        </UseCasesProvider>
      </AppStoreProvider>
    </SafeAreaProvider>,
  );
  return { ...callbacks, gateway, view };
}

const save = () => screen.getByRole('button', { name: auth.recovery.saveAndSignIn });

describe('NewPasswordScreen (S24)', () => {
  it('editing: the explanation and the password, disabled until there is one', async () => {
    await renderScreen();

    expect(await screen.findByText(auth.recovery.newPasswordBody)).toBeOnTheScreen();
    expect(save()).toBeDisabled();

    await userEvent.type(screen.getByLabelText(auth.form.passwordLabel), 'x');

    expect(save()).toBeEnabled();
  });

  it('checking: with no link yet it only waits', async () => {
    await renderScreen(undefined, null);

    expect(screen.queryByText(auth.recovery.invalidLink)).not.toBeOnTheScreen();
    expect(screen.queryByLabelText(auth.form.passwordLabel)).not.toBeOnTheScreen();
  });

  it('AC2: saving a good password leaves the screen', async () => {
    const { onDone, gateway } = await renderScreen();
    await userEvent.type(await screen.findByLabelText(auth.form.passwordLabel), 'contraseña-nueva');

    await userEvent.press(save());

    expect(gateway.newPasswords).toEqual(['contraseña-nueva']);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('error: a short password is flagged next to the field', async () => {
    const { onDone } = await renderScreen();
    await userEvent.type(await screen.findByLabelText(auth.form.passwordLabel), '123');

    await userEvent.press(save());

    expect(screen.getByText(auth.form.passwordTooShort)).toBeOnTheScreen();
    expect(onDone).not.toHaveBeenCalled();
  });

  it('AC3: an invalid link says so and offers to ask for another one', async () => {
    const { onRequestNewLink } = await renderScreen({ status: 'invalidLink' });

    expect(await screen.findByText(auth.recovery.invalidLink)).toBeOnTheScreen();
    expect(screen.getByText(auth.recovery.linkExpiryHelp)).toBeOnTheScreen();
    await userEvent.press(screen.getByRole('button', { name: auth.recovery.requestNewLink }));
    expect(onRequestNewLink).toHaveBeenCalledTimes(1);
  });

  it('unavailable: the link of another account says to sign out first', async () => {
    const gateway = new FakeAuthGateway();
    const account = new InMemoryAccountRepository({ kind: 'user', userId: 'someone-else' });
    const useCases = someUseCases({
      openRecoveryLink: new OpenRecoveryLink(gateway, account),
      completePasswordRecovery: new CompletePasswordRecovery(gateway, account),
    });
    await render(
      <SafeAreaProvider initialMetrics={METRICS}>
        <AppStoreProvider store={createAppStore()}>
          <UseCasesProvider useCases={useCases}>
            <NewPasswordScreen
              url={LINK}
              onBack={jest.fn()}
              onDone={jest.fn()}
              onRequestNewLink={jest.fn()}
            />
          </UseCasesProvider>
        </AppStoreProvider>
      </SafeAreaProvider>,
    );

    expect(await screen.findByText(auth.errors.otherAccount)).toBeOnTheScreen();
  });

  it('leaving the screen without saving closes the recovery session', async () => {
    const { gateway, view } = await renderScreen();
    await screen.findByText(auth.recovery.newPasswordBody);

    await view.unmount();

    expect(gateway.signedOut).toBe(1);
  });
});
