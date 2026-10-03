import { render, screen } from '@testing-library/react-native';

import { HomeScreen } from '@/presentation/features/home/home-screen';

describe('HomeScreen', () => {
  it('renders the home screen', async () => {
    await render(<HomeScreen />);

    expect(screen.getByTestId('home-screen')).toBeOnTheScreen();
  });
});
