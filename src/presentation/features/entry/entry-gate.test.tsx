import { act, render, screen, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import {
  InMemoryOnboardingRepository,
  InMemoryProfileRepository,
  FixedSyncStateRepository,
} from '@/domain/testing/in-memory-repositories';
import { ObserveEntry } from '@/domain/usecases/observe-entry';
import { EntryGate } from '@/presentation/features/entry/entry-gate';
import { LaunchSplashProvider } from '@/presentation/features/startup/launch-splash';
import { strings } from '@/presentation/strings';
import { someUseCases } from '@/presentation/use-cases/testing';
import { UseCasesProvider } from '@/presentation/use-cases/use-cases-context';

const { dataError } = strings.startup;
// Expo Router provides the safe area in the app.
const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 54, left: 0, right: 0, bottom: 34 },
};
const splash = () => screen.queryByTestId('launch-splash', { includeHiddenElements: true });

async function renderGate(useCases = someUseCases()) {
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <UseCasesProvider useCases={useCases}>
        <LaunchSplashProvider>
          <EntryGate>{(entry) => <Text>{entry.kind}</Text>}</EntryGate>
        </LaunchSplashProvider>
      </UseCasesProvider>
    </SafeAreaProvider>,
  );
}

describe('EntryGate (08 §3)', () => {
  it('loading: renders no navigator yet, under the launch splash', async () => {
    await renderGate();

    expect(screen.queryByText('welcome')).not.toBeOnTheScreen();
    expect(splash()).toBeOnTheScreen();
  });

  it('ready: renders the navigator for the entry; a failed read shows the startup error', async () => {
    const profiles = new InMemoryProfileRepository(null);
    await renderGate(
      someUseCases({
        observeEntry: new ObserveEntry(
          profiles,
          new InMemoryOnboardingRepository(),
          new FixedSyncStateRepository(),
        ),
      }),
    );

    expect(screen.getByText('welcome')).toBeOnTheScreen();
    // marca §16: the navigator is what the app shows first, so the launch splash leaves.
    await waitFor(() => expect(splash()).not.toBeOnTheScreen());

    await act(() => profiles.fail());
    expect(screen.getByRole('button', { name: dataError.retry })).toBeOnTheScreen();
  });
});
