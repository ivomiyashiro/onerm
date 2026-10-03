import { render, screen } from '@testing-library/react-native';

import { HomeScreen } from '@/presentation/features/home/home-screen';

describe('HomeScreen', () => {
  it('renderiza la pantalla inicial', async () => {
    await render(<HomeScreen />);

    expect(screen.getByTestId('home-screen')).toBeOnTheScreen();
  });
});
