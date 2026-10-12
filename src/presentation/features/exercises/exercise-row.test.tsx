import { render, screen, userEvent } from '@testing-library/react-native';

import { ExerciseRow } from '@/presentation/features/exercises/exercise-row';
import { anExercise } from '@/domain/testing/builders';

jest.useFakeTimers();

const CHEST_PRESS = anExercise({
  name: 'Press de pecho en máquina',
  primaryMuscles: ['chest'],
  primaryEquipment: 'machine',
});

describe('ExerciseRow', () => {
  it('shows the name and «primary muscle · equipment»', async () => {
    await render(<ExerciseRow exercise={CHEST_PRESS} onPress={jest.fn()} />);

    expect(screen.getByText('Press de pecho en máquina')).toBeOnTheScreen();
    expect(screen.getByText('Pecho · Máquina')).toBeOnTheScreen();
  });

  it('is a button named after the exercise that opens it', async () => {
    const user = userEvent.setup();
    const onPress = jest.fn();
    await render(<ExerciseRow exercise={CHEST_PRESS} onPress={onPress} />);

    await user.press(screen.getByRole('button', { name: 'Press de pecho en máquina' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
