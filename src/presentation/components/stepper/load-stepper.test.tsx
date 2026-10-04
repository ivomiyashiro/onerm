import { render, screen, userEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { LoadStepper } from '@/presentation/components/stepper/load-stepper';
import { colors } from '@/presentation/theme';

jest.useFakeTimers();

const baseProps = {
  label: 'Carga',
  value: '62,5',
  unit: 'kg',
  decrementLabel: 'Bajar la carga',
  incrementLabel: 'Subir la carga',
  onDecrement: jest.fn(),
  onIncrement: jest.fn(),
};

describe('LoadStepper', () => {
  it('reads the label, value and unit as one item', async () => {
    await render(<LoadStepper {...baseProps} />);

    expect(screen.getByLabelText('Carga 62,5 kg')).toBeOnTheScreen();
  });

  it('the ± are 56 dp buttons with their own labels (RNF-16, RNF-18)', async () => {
    await render(<LoadStepper {...baseProps} />);

    for (const name of ['Bajar la carga', 'Subir la carga']) {
      const plate = screen.getByRole('button', { name });
      const style = StyleSheet.flatten(plate.props.style);
      expect(style.width).toBe(56);
      expect(style.height).toBe(56);
    }
  });

  it('calls onDecrement and onIncrement', async () => {
    const user = userEvent.setup();
    const onDecrement = jest.fn();
    const onIncrement = jest.fn();
    await render(
      <LoadStepper {...baseProps} onDecrement={onDecrement} onIncrement={onIncrement} />,
    );

    await user.press(screen.getByRole('button', { name: 'Bajar la carga' }));
    await user.press(screen.getByRole('button', { name: 'Subir la carga' }));

    expect(onDecrement).toHaveBeenCalledTimes(1);
    expect(onIncrement).toHaveBeenCalledTimes(1);
  });

  it('shows the note under the value', async () => {
    await render(<LoadStepper {...baseProps} note="Subimos 2,5 kg" />);

    expect(screen.getByText('Subimos 2,5 kg')).toHaveStyle({ color: colors.textSecondary });
  });

  it('an error note is red and announced', async () => {
    await render(<LoadStepper {...baseProps} note="Máximo 500 kg" error />);

    const note = screen.getByText('Máximo 500 kg');
    expect(note).toHaveStyle({ color: colors.textErr });
    expect(note.props.accessibilityLiveRegion).toBe('polite');
  });

  it('the value uses the tabular number style', async () => {
    await render(<LoadStepper {...baseProps} />);

    expect(screen.getByText('62,5')).toHaveStyle({
      fontFamily: 'ArchivoCondensed-Bold',
      fontSize: 56,
      fontVariant: ['tabular-nums'],
    });
  });
});
