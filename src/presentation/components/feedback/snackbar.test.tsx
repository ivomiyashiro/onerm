import { act, render, screen, userEvent } from '@testing-library/react-native';

import { Snackbar } from '@/presentation/components/feedback/snackbar';

jest.useFakeTimers();

describe('Snackbar', () => {
  it('is announced to the screen reader', async () => {
    await render(<Snackbar message="Serie eliminada" onDismiss={jest.fn()} />);

    expect(screen.getByRole('alert')).toHaveAccessibleName('Serie eliminada');
  });

  it('dismisses itself after 5 s', async () => {
    const onDismiss = jest.fn();
    await render(<Snackbar message="Serie eliminada" onDismiss={onDismiss} />);

    await act(() => jest.advanceTimersByTime(4999));
    expect(onDismiss).not.toHaveBeenCalled();
    await act(() => jest.advanceTimersByTime(1));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('dismisses after 5 s even if the parent re-renders with a new callback', async () => {
    const onDone = jest.fn();
    const { rerender } = await render(
      <Snackbar message="Serie eliminada" onDismiss={() => onDone()} />,
    );

    for (let second = 0; second < 5; second++) {
      await act(() => jest.advanceTimersByTime(1000));
      await rerender(<Snackbar message="Serie eliminada" onDismiss={() => onDone()} />);
    }

    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('runs the action and dismisses', async () => {
    const user = userEvent.setup();
    const onUndo = jest.fn();
    const onDismiss = jest.fn();
    await render(
      <Snackbar
        message="Serie eliminada"
        action={{ label: 'Deshacer', onPress: onUndo }}
        onDismiss={onDismiss}
      />,
    );

    await user.press(screen.getByRole('button', { name: 'Deshacer' }));

    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
