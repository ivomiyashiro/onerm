import { render, screen } from '@testing-library/react-native';

import { HomeScreen } from '@/presentation/features/home/home-screen';
import { dev } from '@/presentation/strings/dev';

describe('HomeScreen', () => {
  it('renders the S07 skeleton', async () => {
    await render(<HomeScreen />);

    expect(screen.getByRole('header', { name: dev.screens.S07 })).toBeOnTheScreen();
  });
});
