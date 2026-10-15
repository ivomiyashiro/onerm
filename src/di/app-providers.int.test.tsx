import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { CATALOG_SNAPSHOT } from '@/data/catalog/catalog-snapshot';
import { loadCatalogSnapshot } from '@/data/catalog/load-catalog-snapshot';
import { openTestLocalDatabase } from '@/data/db/open-test-database';
import { ManualTableChanges } from '@/data/db/table-changes';
import { AppProviders } from '@/di/app-providers';
import { FakeDevicePermissions, FakeRestNotifier } from '@/domain/testing/in-memory-repositories';
import { useExerciseSearchViewModel } from '@/presentation/features/exercises/use-exercise-search-view-model';
import { useAppStore } from '@/presentation/state/app-store-context';

function Probe() {
  const { state } = useExerciseSearchViewModel();
  const account = useAppStore((s) => s.account);
  return (
    <>
      <Text testID="owner">{account.kind}</Text>
      {state.status === 'content' &&
        state.exercises.map((exercise) => <Text key={exercise.id}>{exercise.name}</Text>)}
    </>
  );
}

describe('AppProviders', () => {
  it('wires the ViewModels to the SQLite catalog and starts as a guest', async () => {
    const localDatabase = openTestLocalDatabase((db) => loadCatalogSnapshot(db, CATALOG_SNAPSHOT));
    await localDatabase.prepare();

    await render(
      <AppProviders
        storage={{ localDatabase, changes: new ManualTableChanges() }}
        device={{ notifier: new FakeRestNotifier(), permissions: new FakeDevicePermissions() }}
      >
        <Probe />
      </AppProviders>,
    );

    expect(screen.getByText('Prensa de piernas')).toBeOnTheScreen();
    expect(screen.getAllByText(/./).length).toBeGreaterThan(22);
    expect(screen.getByTestId('owner')).toHaveTextContent('guest');
  });
});
