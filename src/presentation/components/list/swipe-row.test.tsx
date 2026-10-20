import { act, fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import { Pressable, StyleSheet, Text } from 'react-native';
import { State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';

import { SwipeRow } from '@/presentation/components/list/swipe-row';

jest.useFakeTimers();

let mockFocused = true;
jest.mock('expo-router', () => ({ useIsFocused: () => mockFocused }));

function row(onEdit = jest.fn(), onDelete = jest.fn()) {
  return (
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
    </SwipeRow>
  );
}

async function renderRow() {
  const onEdit = jest.fn();
  const onDelete = jest.fn();
  await render(row(onEdit, onDelete));
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
  beforeEach(() => {
    mockFocused = true;
  });

  it('#257: open, it closes without animation when its screen loses focus', async () => {
    await renderRow();
    await swipe(-160);
    expect(screen.getByRole('button', { name: 'Eliminar' })).toBeOnTheScreen();

    mockFocused = false;
    await screen.rerender(row());

    expect(screen.queryByRole('button', { name: 'Eliminar' })).not.toBeOnTheScreen();
  });

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

  it('#254: open, swiping it back to the right also takes the touch', async () => {
    await renderRow();
    await swipe(-160);
    const row = screen.getByRole('button', { name: 'Press de banca' });
    const touch = (pageX: number) => ({ nativeEvent: { pageX, pageY: 100 } });

    await fireEvent(row, 'startShouldSetResponderCapture', touch(100));

    expect(await fireEvent(row, 'moveShouldSetResponderCapture', touch(130))).toBe(true);
  });

  it('#254: with the row back in place the actions are invisible, even while the spring settles', async () => {
    await renderRow();
    const at = (translationX: number) =>
      act(() =>
        fireGestureHandler(getByGestureTestId('swipe Press'), [
          { state: State.BEGAN, translationX: 0 },
          { state: State.ACTIVE, translationX },
        ]),
      );
    const opacity = () =>
      StyleSheet.flatten(
        screen.getByTestId('actions Press', { includeHiddenElements: true }).props.style,
      ).opacity;

    await at(0);

    expect(opacity()).toBe(0);
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
