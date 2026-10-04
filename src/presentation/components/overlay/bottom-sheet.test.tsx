import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import { Text } from 'react-native';

import { BottomSheet, MenuItem } from '@/presentation/components/overlay/bottom-sheet';

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
    ['the back button', async () => fireEvent(screen.getByTestId('sheet'), 'requestClose')],
  ])('%s closes it', async (_, close) => {
    const onClose = jest.fn();
    await renderSheet(onClose);

    await close();

    expect(onClose).toHaveBeenCalledTimes(1);
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
