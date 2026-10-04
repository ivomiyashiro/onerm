import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { AppProviders } from '@/di/app-providers';
import { useExerciseListViewModel } from '@/presentation/features/exercises/use-exercise-list-view-model';
import { useAppStore } from '@/presentation/state/app-store-context';

function Probe() {
  const { state } = useExerciseListViewModel();
  const owner = useAppStore((s) => s.owner);
  return (
    <>
      <Text testID="owner">{owner.kind}</Text>
      {state.status === 'content' &&
        state.exercises.map((exercise) => <Text key={exercise.id}>{exercise.name}</Text>)}
    </>
  );
}

describe('AppProviders', () => {
  it('wires the ViewModels to the in-memory catalog and starts as a guest', async () => {
    await render(
      <AppProviders>
        <Probe />
      </AppProviders>,
    );

    expect(screen.getByText('Sentadilla con barra')).toBeOnTheScreen();
    expect(screen.getByTestId('owner')).toHaveTextContent('guest');
  });
});
