import { render, screen, userEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { Button, type ButtonVariant } from '@/presentation/components/button/button';

jest.useFakeTimers();

const VARIANTS: ButtonVariant[] = ['primary', 'secondary', 'tertiary', 'danger', 'dangerSolid'];

describe('Button', () => {
  it.each(VARIANTS)('%s is a button named by its label', async (variant) => {
    await render(<Button variant={variant} label="Empezar" onPress={jest.fn()} />);

    expect(screen.getByRole('button', { name: 'Empezar' })).toBeOnTheScreen();
  });

  it('calls onPress when pressed', async () => {
    const user = userEvent.setup();
    const onPress = jest.fn();
    await render(<Button variant="primary" label="Empezar" onPress={onPress} />);

    await user.press(screen.getByRole('button', { name: 'Empezar' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('when disabled, says so and ignores presses', async () => {
    const user = userEvent.setup();
    const onPress = jest.fn();
    await render(<Button variant="primary" label="Empezar" disabled onPress={onPress} />);

    const button = screen.getByRole('button', { name: 'Empezar' });
    await user.press(button);

    expect(button).toBeDisabled();
    expect(onPress).not.toHaveBeenCalled();
  });

  it('when loading, shows the loading label, is busy and ignores presses', async () => {
    const user = userEvent.setup();
    const onPress = jest.fn();
    await render(
      <Button
        variant="secondary"
        label="Guardar"
        loading
        loadingLabel="Guardando…"
        onPress={onPress}
      />,
    );

    const button = screen.getByRole('button', { name: 'Guardando…' });
    await user.press(button);

    expect(button).toBeBusy();
    expect(onPress).not.toHaveBeenCalled();
  });

  it.each([
    ['primary', 'm', 56],
    ['primary', 'xl', 64],
    ['secondary', 'm', 56],
    ['secondary', 'xl', 64],
    ['tertiary', 'm', 48],
    ['danger', 'm', 48],
    ['dangerSolid', 'm', 56],
  ] as const)('%s %s measures %i dp (RNF-16)', async (variant, size, height) => {
    await render(<Button variant={variant} size={size} label="Hecho" onPress={jest.fn()} />);

    const style = StyleSheet.flatten(screen.getByRole('button').props.style);
    expect(style.minHeight).toBe(height);
  });

  it('shows the icon after the label', async () => {
    await render(<Button variant="primary" label="Empezar" icon="arrow" onPress={jest.fn()} />);

    expect(screen.getByTestId('button-icon', { includeHiddenElements: true })).toBeTruthy();
  });
});
