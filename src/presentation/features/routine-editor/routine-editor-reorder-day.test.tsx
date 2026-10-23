import { act, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import { State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';

import {
  layOut,
  renderReorderScreen,
} from '@/presentation/features/routine-editor/routine-editor-reorder-screen';

jest.useFakeTimers();

// The rows ask whether their screen is focused (#257); there is no navigator here.
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useIsFocused: () => true,
}));

// A drop leaves springs that end in the next press, so each drag has its own file.
beforeEach(() => {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
});

describe('RoutineEditorScreen day reordering', () => {
  it('RF-RUT-05.AC1: dragging a day chip after holding it drops it in another position', async () => {
    await renderReorderScreen();
    ['Día A', 'Día B'].forEach((name, index) => layOut(`day ${name}`, index * 100, 0, 92, 48));

    await act(() => {
      fireGestureHandler(getByGestureTestId('drag day Día A'), [
        { state: State.BEGAN, translationX: 0 },
        { state: State.ACTIVE, translationX: 50 },
        { state: State.ACTIVE, translationX: 110 },
        { state: State.END, translationX: 110 },
      ]);
    });
    // Both springs end inside the act of a press.
    await act(() => jest.runOnlyPendingTimers());

    expect(screen.getAllByRole('checkbox').map((chip) => chip.props.accessibilityLabel)).toEqual([
      'Día B',
      'Día A',
    ]);
    // The chosen day stays the chosen one.
    expect(screen.getByRole('checkbox', { name: 'Día A', checked: true })).toBeOnTheScreen();
  });
});
