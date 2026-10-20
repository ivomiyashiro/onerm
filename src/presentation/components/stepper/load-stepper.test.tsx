import { act, render, screen, userEvent } from '@testing-library/react-native';
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

    expect(screen.getByText('Subimos 2,5 kg')).toBeOnTheScreen();
  });

  it('an error note is red and announced', async () => {
    await render(<LoadStepper {...baseProps} note="Máximo 500 kg" error />);

    const note = screen.getByText('Máximo 500 kg');
    expect(note).toHaveStyle({ color: colors.textErr });
    expect(note.props.accessibilityLiveRegion).toBe('polite');
  });

  it('#140: without a value the field is empty and shows the placeholder, so typing starts clean', async () => {
    await render(<LoadStepper {...baseProps} value="" placeholder="—" onChangeText={jest.fn()} />);

    const input = screen.getByLabelText('Carga');
    expect(input.props.value).toBe('');
    expect(input.props.placeholder).toBe('—');
  });

  it('#248 M2: after ±, the old value rolls out hidden from the screen reader, and leaves', async () => {
    const user = userEvent.setup();
    const { rerender } = await render(<LoadStepper {...baseProps} />);

    await user.press(screen.getByRole('button', { name: 'Subir la carga' }));
    await rerender(<LoadStepper {...baseProps} value="65" />);

    expect(screen.getByLabelText('Carga 65 kg')).toBeOnTheScreen();
    expect(screen.queryByText('62,5')).toBeNull();
    expect(screen.getByText('62,5', { includeHiddenElements: true })).toBeOnTheScreen();

    await act(() => jest.advanceTimersByTime(1000));

    expect(screen.queryByText('62,5', { includeHiddenElements: true })).toBeNull();
  });

  it('#248 M2: a typed value does not roll', async () => {
    const { rerender } = await render(<LoadStepper {...baseProps} onChangeText={jest.fn()} />);

    await rerender(<LoadStepper {...baseProps} value="65" onChangeText={jest.fn()} />);

    expect(screen.queryByText('62,5', { includeHiddenElements: true })).toBeNull();
  });
});
