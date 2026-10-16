import { act, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import {
  InMemoryOnboardingRepository,
  InMemoryProfileRepository,
  FixedSyncStateRepository,
} from '@/domain/testing/in-memory-repositories';
import { ObserveEntry } from '@/domain/usecases/observe-entry';
import { EntryGate } from '@/presentation/features/entry/entry-gate';
import { strings } from '@/presentation/strings';
import { someUseCases } from '@/presentation/use-cases/testing';
import { UseCasesProvider } from '@/presentation/use-cases/use-cases-context';

const { dataError } = strings.startup;
// Expo Router provides the safe area in the app.
const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 54, left: 0, right: 0, bottom: 34 },
};

async function renderGate(useCases = someUseCases()) {
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <UseCasesProvider useCases={useCases}>
        <EntryGate>{(entry) => <Text>{entry.kind}</Text>}</EntryGate>
      </UseCasesProvider>
    </SafeAreaProvider>,
  );
}

describe('EntryGate (08 §3)', () => {
  it('loading: renders no navigator yet', async () => {
    await renderGate();

    expect(screen.queryByText('welcome')).not.toBeOnTheScreen();
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

    await act(() => profiles.fail());
    expect(screen.getByRole('button', { name: dataError.retry })).toBeOnTheScreen();
  });
});
