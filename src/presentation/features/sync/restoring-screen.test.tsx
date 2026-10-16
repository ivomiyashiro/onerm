import { render, screen, userEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { ContinueAfterAuth } from '@/domain/usecases/continue-after-auth';
import type { ObserveRestoration, Restoration } from '@/domain/usecases/observe-restoration';
import { RestoringScreen } from '@/presentation/features/sync/restoring-screen';
import { profile } from '@/presentation/strings/profile';
import { someUseCases } from '@/presentation/use-cases/testing';
import { UseCasesProvider } from '@/presentation/use-cases/use-cases-context';

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 54, left: 0, right: 0, bottom: 34 },
};
const { restoring } = profile;

async function renderScreen(restoration: Restoration) {
  const continued: boolean[] = [];
  const continueAfterAuth = {
    execute: async (options?: { evenIfRestoring?: boolean }) =>
      void continued.push(options?.evenIfRestoring ?? false),
  } as unknown as ContinueAfterAuth;
  const observeRestoration = {
    execute: (listener: (r: Restoration) => void) => (listener(restoration), () => {}),
  } as unknown as ObserveRestoration;
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <UseCasesProvider useCases={someUseCases({ continueAfterAuth, observeRestoration })}>
        <RestoringScreen />
      </UseCasesProvider>
    </SafeAreaProvider>,
  );
  return { continued };
}

describe('RestoringScreen (S23)', () => {
  it('starting: the title without a percentage yet', async () => {
    await renderScreen({ status: 'starting' });

    expect(screen.getByText(restoring.title(null))).toBeOnTheScreen();
    expect(screen.getByText(restoring.help)).toBeOnTheScreen();
  });

  it('RF-SYNC-03.AC1: «Restaurando tus datos… 25 %» and «30 de 120 registros»', async () => {
    await renderScreen({ status: 'restoring', done: 30, total: 120, percent: 25 });

    expect(screen.getByText(restoring.title(25))).toBeOnTheScreen();
    expect(screen.getByText(restoring.progress(30, 120))).toBeOnTheScreen();
  });

  it('RF-SYNC-03.AC2: cut short, it says so and «Continuar» goes on', async () => {
    const { continued } = await renderScreen({ status: 'interrupted' });

    expect(screen.getByText(restoring.interrupted)).toBeOnTheScreen();
    expect(screen.getByText(restoring.interruptedBody)).toBeOnTheScreen();
    await userEvent.press(screen.getByRole('button', { name: restoring.continue }));

    expect(continued).toEqual([true]);
  });
});
