import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { Badge } from '@/presentation/components/badge/badge';
import { colors } from '@/presentation/theme';

describe('Badge', () => {
  it('shows its label on the neutral surface', async () => {
    await render(<Badge label="Mancuerna" testID="badge" />);

    expect(screen.getByText('Mancuerna')).toBeOnTheScreen();
    expect(StyleSheet.flatten(screen.getByTestId('badge').props.style)).toMatchObject({
      backgroundColor: colors.bgRaised,
    });
  });

  it('the inverse tone highlights it', async () => {
    await render(<Badge label="Espalda" tone="inverse" testID="badge" />);

    expect(StyleSheet.flatten(screen.getByTestId('badge').props.style)).toMatchObject({
      backgroundColor: colors.bgInverse,
    });
  });
});
