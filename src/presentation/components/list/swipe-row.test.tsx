import { act, fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';
import { State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';

import { SwipeRow } from '@/presentation/components/list/swipe-row';

jest.useFakeTimers();

async function renderRow() {
  const onEdit = jest.fn();
  const onDelete = jest.fn();
  await render(
    <SwipeRow
      testID="Press"
      actions={[
        { key: 'edit', label: 'Editar', icon: 'edit', onPress: onEdit },
        { key: 'delete', label: 'Eliminar', icon: 'trash', destructive: true, onPress: onDelete },
      ]}
    >
      {(a11y) => (
        <Pressable accessibilityRole="button" accessibilityLabel="Press de banca" {...a11y}>
          <Text>Press de banca</Text>
        </Pressable>
      )}
    </SwipeRow>,
  );
  return { onEdit, onDelete };
}

const swipe = (translationX: number) =>
  act(() =>
    fireGestureHandler(getByGestureTestId('swipe Press'), [
      { state: State.BEGAN, translationX: 0 },
      { state: State.ACTIVE, translationX: translationX / 2 },
      { state: State.END, translationX },
    ]),
  );

describe('SwipeRow (#198)', () => {
  it('swiped left, it shows its actions; one of them runs and the row closes', async () => {
    const { onDelete } = await renderRow();
    expect(screen.queryByRole('button', { name: 'Eliminar' })).not.toBeOnTheScreen();

    await swipe(-160);
    await userEvent.setup().press(screen.getByRole('button', { name: 'Eliminar' }));

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Eliminar' })).not.toBeOnTheScreen();
  });

  it('a short swipe leaves it closed', async () => {
    await renderRow();

    await swipe(-30);

    expect(screen.queryByRole('button', { name: 'Eliminar' })).not.toBeOnTheScreen();
  });

  it('#254: once it is a swipe, it takes the touch from the row, so the row is not pressed', async () => {
    await renderRow();
    const row = screen.getByRole('button', { name: 'Press de banca' });
    const touch = (pageX: number, pageY = 100) => ({ nativeEvent: { pageX, pageY } });
    const claims = (pageX: number, pageY?: number) =>
      fireEvent(row, 'moveShouldSetResponderCapture', touch(pageX, pageY));

    await fireEvent(row, 'startShouldSetResponderCapture', touch(200));

    expect(await claims(190)).toBe(false);
    expect(await claims(170)).toBe(true);
    // Rightwards is left to the screen (S09 changes exercise), and down to the scroll.
    expect(await claims(230)).toBe(false);
    expect(await claims(180, 130)).toBe(false);
  });

  it('RNF-18: a screen reader reaches the same actions on the row', async () => {
    const { onEdit } = await renderRow();
    const row = screen.getByRole('button', { name: 'Press de banca' });

    expect(row.props.accessibilityActions).toEqual([
      { name: 'edit', label: 'Editar' },
      { name: 'delete', label: 'Eliminar' },
    ]);
    fireEvent(row, 'accessibilityAction', { nativeEvent: { actionName: 'edit' } });

    expect(onEdit).toHaveBeenCalledTimes(1);
  });
});
