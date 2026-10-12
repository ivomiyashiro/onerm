import { render, screen, userEvent } from '@testing-library/react-native';

import { TopBar } from '@/presentation/components/navigation/top-bar';

jest.useFakeTimers();

describe('TopBar', () => {
  it('shows the title as the screen header', async () => {
    await render(<TopBar title="Ejercicio" backLabel="Atrás" onBack={jest.fn()} />);

    expect(screen.getByRole('header', { name: 'Ejercicio' })).toBeOnTheScreen();
  });

  it('the back button is named and goes back', async () => {
    const user = userEvent.setup();
    const onBack = jest.fn();
    await render(<TopBar title="Ejercicio" backLabel="Atrás" onBack={onBack} />);

    await user.press(screen.getByRole('button', { name: 'Atrás' }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
