import { render, screen, userEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { StartAsGuest } from '@/domain/usecases/start-as-guest';
import { WelcomeScreen } from '@/presentation/features/welcome/welcome-screen';
import { auth } from '@/presentation/strings/auth';
import { someUseCases } from '@/presentation/use-cases/testing';
import { UseCasesProvider } from '@/presentation/use-cases/use-cases-context';

jest.useFakeTimers();

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 54, left: 0, right: 0, bottom: 34 },
};

async function renderScreen() {
  const execute = jest.fn(async () => {});
  const startAsGuest = { execute } as unknown as StartAsGuest;
  const onSignUp = jest.fn();
  const onSignIn = jest.fn();
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <UseCasesProvider useCases={someUseCases({ startAsGuest })}>
        <WelcomeScreen onSignUp={onSignUp} onSignIn={onSignIn} />
      </UseCasesProvider>
    </SafeAreaProvider>,
  );
  return { execute, onSignUp, onSignIn };
}

describe('WelcomeScreen (S01)', () => {
  it('shows the headline and the three ways in', async () => {
    await renderScreen();

    expect(screen.getByRole('header', { name: auth.welcome.title })).toBeOnTheScreen();
    expect(screen.getByText(auth.welcome.body)).toBeOnTheScreen();
  });

  it('RF-AUTH-01.AC1: «Continuar sin cuenta» starts as a guest', async () => {
    const { execute } = await renderScreen();

    await userEvent.press(screen.getByRole('button', { name: auth.welcome.continueAsGuest }));

    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('«Crear cuenta» and «Iniciar sesión» open the account screens', async () => {
    const { onSignUp, onSignIn } = await renderScreen();

    await userEvent.press(screen.getByRole('button', { name: auth.welcome.signUp }));
    await userEvent.press(screen.getByRole('button', { name: auth.welcome.signIn }));

    expect(onSignUp).toHaveBeenCalled();
    expect(onSignIn).toHaveBeenCalled();
  });
});
