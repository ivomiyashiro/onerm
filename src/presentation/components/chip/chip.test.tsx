import { render, screen, userEvent } from '@testing-library/react-native';

import { Chip } from '@/presentation/components/chip/chip';

jest.useFakeTimers();

describe('Chip', () => {
  it('is a named toggle that reports its state', async () => {
    await render(<Chip label="Pecho" selected onPress={jest.fn()} />);

    expect(screen.getByRole('checkbox', { name: 'Pecho' })).toBeChecked();
  });

  it('unselected, it is not checked', async () => {
    await render(<Chip label="Pecho" selected={false} onPress={jest.fn()} />);

    expect(screen.getByRole('checkbox', { name: 'Pecho' })).not.toBeChecked();
  });

  it('pressing it calls onPress', async () => {
    const user = userEvent.setup();
    const onPress = jest.fn();
    await render(<Chip label="Pecho" selected={false} onPress={onPress} />);

    await user.press(screen.getByRole('checkbox', { name: 'Pecho' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('an action chip is a button, without a checked state', async () => {
    await render(<Chip label="Más filtros" onPress={jest.fn()} />);

    expect(screen.getByRole('button', { name: 'Más filtros' })).toBeOnTheScreen();
  });
});
