import { render, screen } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';

import { Card } from '@/presentation/components/card/card';
import { colors } from '@/presentation/theme';

describe('Card', () => {
  it('renders its content on the card surface', async () => {
    await render(
      <Card testID="card">
        <Text>Lo de hoy</Text>
      </Card>,
    );

    expect(screen.getByText('Lo de hoy')).toBeOnTheScreen();
    expect(StyleSheet.flatten(screen.getByTestId('card').props.style)).toMatchObject({
      backgroundColor: colors.bgCard,
      borderColor: colors.borderHair,
      borderRadius: 20,
    });
  });
});
