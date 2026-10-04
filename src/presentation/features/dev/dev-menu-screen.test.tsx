import { render, screen, userEvent } from '@testing-library/react-native';

import { DevMenuScreen } from '@/presentation/features/dev/dev-menu-screen';
import { SCREEN_IDS, screenRoutes } from '@/presentation/features/dev/screen-routes';
import { dev } from '@/presentation/strings/dev';

jest.useFakeTimers();

describe('DevMenuScreen', () => {
  it('lists the 25 screens and the component showcase', async () => {
    await render(<DevMenuScreen onOpen={jest.fn()} onOpenComponents={jest.fn()} />);

    for (const id of SCREEN_IDS) {
      expect(screen.getByRole('button', { name: `${id} ${dev.screens[id]}` })).toBeOnTheScreen();
    }
    expect(screen.getByRole('button', { name: dev.components })).toBeOnTheScreen();
  });

  it('opens the route of the pressed screen', async () => {
    const user = userEvent.setup();
    const onOpen = jest.fn();
    await render(<DevMenuScreen onOpen={onOpen} onOpenComponents={jest.fn()} />);

    await user.press(screen.getByRole('button', { name: `S14 ${dev.screens.S14}` }));

    expect(onOpen).toHaveBeenCalledWith(screenRoutes.S14);
  });
});
