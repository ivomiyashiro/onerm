import { render, screen, userEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ObserveExercises } from '@/domain/usecases/observe-exercises';
import { PrepareLocalData } from '@/domain/usecases/prepare-local-data';
import { StartupGate } from '@/presentation/features/startup/startup-gate';
import { strings } from '@/presentation/strings';
import { UseCasesProvider } from '@/presentation/use-cases/use-cases-context';

const { dataError } = strings.startup;
// Expo Router provides the safe area in the app.
const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 54, left: 0, right: 0, bottom: 34 },
};

async function renderGate(prepare: () => Promise<void>) {
  const useCases = {
    observeExercises: new ObserveExercises({ observeAll: () => () => {} }),
    prepareLocalData: new PrepareLocalData({ prepare }),
  };
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <UseCasesProvider useCases={useCases}>
        <StartupGate>
          <Text>App</Text>
        </StartupGate>
      </UseCasesProvider>
    </SafeAreaProvider>,
  );
}

describe('StartupGate (08 §3, 07 §6)', () => {
  it('preparing: shows neither the app nor the error', async () => {
    await renderGate(() => new Promise(() => {}));

    expect(screen.queryByText('App')).not.toBeOnTheScreen();
    expect(screen.queryByText(dataError.title)).not.toBeOnTheScreen();
  });

  it('ready: mounts the app', async () => {
    await renderGate(() => Promise.resolve());

    expect(await screen.findByText('App')).toBeOnTheScreen();
  });

  it('error: shows «No pudimos preparar tus datos» with Reintentar, and not the app', async () => {
    await renderGate(() => Promise.reject(new Error('migration failed')));

    expect(await screen.findByRole('header', { name: dataError.title })).toBeOnTheScreen();
    expect(screen.getByText(dataError.body)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: dataError.retry })).toBeOnTheScreen();
    expect(screen.queryByText('App')).not.toBeOnTheScreen();
  });

  it('Reintentar prepares again and mounts the app when it works', async () => {
    const prepare = jest
      .fn<Promise<void>, []>()
      .mockRejectedValueOnce(new Error('migration failed'))
      .mockResolvedValueOnce(undefined);
    await renderGate(prepare);

    await userEvent.press(await screen.findByRole('button', { name: dataError.retry }));

    expect(await screen.findByText('App')).toBeOnTheScreen();
    expect(prepare).toHaveBeenCalledTimes(2);
  });
});
