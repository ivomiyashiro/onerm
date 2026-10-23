import type { ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { render, screen, userEvent, within } from '@testing-library/react-native';
import { Dimensions, Text } from 'react-native';

import { BottomSheet, MenuItem } from '@/presentation/components/overlay/bottom-sheet';

// The sheet floats above the system bar, so it reads the safe area.
const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 54, left: 0, right: 0, bottom: 34 },
};
const wrapper = ({ children }: { children: ReactNode }) => (
  <SafeAreaProvider initialMetrics={METRICS}>{children}</SafeAreaProvider>
);

jest.useFakeTimers();

const renderSheet = (onClose = jest.fn()) =>
  render(
    <BottomSheet
      visible
      title="Press de banca con barra"
      subtitle="Ejercicio 2 de 6"
      closeLabel="Cerrar"
      onClose={onClose}
      testID="sheet"
    >
      <Text>Contenido</Text>
    </BottomSheet>,
    { wrapper },
  );

describe('BottomSheet', () => {
  it('shows the title, the subtitle and the content', async () => {
    await renderSheet();

    expect(screen.getByRole('header', { name: 'Press de banca con barra' })).toBeOnTheScreen();
    expect(screen.getByText('Ejercicio 2 de 6')).toBeOnTheScreen();
    expect(screen.getByText('Contenido')).toBeOnTheScreen();
  });

  it.each([
    [
      'the close button',
      async () => userEvent.setup().press(screen.getByRole('button', { name: 'Cerrar' })),
    ],
    [
      'the scrim',
      async () =>
        userEvent.setup().press(screen.getByTestId('sheet-scrim', { includeHiddenElements: true })),
    ],
  ])('%s closes it', async (_, close) => {
    const onClose = jest.fn();
    await renderSheet(onClose);

    await close();

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('BottomSheet with tall content', () => {
  it('caps its height to the screen and scrolls the content, keeping the footer outside', async () => {
    await render(
      <BottomSheet
        visible
        title="Elegir día"
        closeLabel="Cerrar"
        onClose={jest.fn()}
        testID="sheet"
        scrollContent
        footer={<Text>Pie</Text>}
      >
        <Text>Contenido</Text>
      </BottomSheet>,
      { wrapper },
    );

    // Below the top safe area (54) and above the system bar (34) plus its gaps (8 + 16).
    const { height } = Dimensions.get('window');
    expect(screen.getByTestId('sheet')).toHaveStyle({ maxHeight: height - 54 - 34 - 8 - 16 });
    const scroll = screen.getByTestId('sheet-body');
    expect(within(scroll).getByText('Contenido')).toBeOnTheScreen();
    expect(within(scroll).queryByText('Pie')).not.toBeOnTheScreen();
  });
});

describe('MenuItem', () => {
  it('is a 56 dp button named by its label', async () => {
    const user = userEvent.setup();
    const onPress = jest.fn();
    await render(<MenuItem icon="plus" label="Agregar serie" onPress={onPress} />);

    await user.press(screen.getByRole('button', { name: 'Agregar serie' }));

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button')).toHaveStyle({ minHeight: 56 });
  });
});
