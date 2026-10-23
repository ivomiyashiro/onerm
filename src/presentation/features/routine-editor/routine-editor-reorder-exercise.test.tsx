import { screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import { State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';

import {
  layOut,
  renderReorderScreen,
} from '@/presentation/features/routine-editor/routine-editor-reorder-screen';
import { routines as text } from '@/presentation/strings/routines';

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

describe('RoutineEditorScreen exercise reordering', () => {
  it('RF-RUT-05.AC1: dragging an exercise by its handle drops it in another position', async () => {
    const { user, routines } = await renderReorderScreen();
    ['Prensa de piernas', 'Curl de bíceps'].forEach((name, index) =>
      layOut(`row ${name}`, 0, index * 72, 358, 72),
    );

    fireGestureHandler(getByGestureTestId('drag Prensa de piernas'), [
      { state: State.BEGAN, translationY: 0 },
      { state: State.ACTIVE, translationY: 40 },
      { state: State.ACTIVE, translationY: 80 },
      { state: State.END, translationY: 80 },
    ]);
    await user.press(screen.getByRole('button', { name: text.editor.save }));

    expect(routines.routines[0].days[0].exercises.map((e) => e.id)).toEqual(['re-2', 're-1']);
  });
});
