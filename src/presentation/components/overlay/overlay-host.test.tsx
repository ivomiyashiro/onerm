import { act, render, screen, userEvent } from '@testing-library/react-native';
import { useState } from 'react';
import { BackHandler, Pressable, Text } from 'react-native';

import { Overlay, OverlayHost } from '@/presentation/components/overlay/overlay-host';

jest.useFakeTimers();

/** A screen with a button that opens an overlay, which closes with its own button or Back. */
function Screen({ onOpen = () => {} }: { onOpen?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          onOpen();
          setOpen(true);
        }}
      >
        <Text>Abrir</Text>
      </Pressable>
      <Overlay visible={open} onRequestClose={() => setOpen(false)}>
        <Pressable accessibilityRole="button" onPress={() => setOpen(false)}>
          <Text>Cerrar</Text>
        </Pressable>
      </Overlay>
    </>
  );
}

const renderInHost = (onOpen?: () => void) =>
  render(
    <OverlayHost>
      <Screen onOpen={onOpen} />
    </OverlayHost>,
  );

describe('OverlayHost', () => {
  it('draws the overlay over the screen and hides the screen from screen readers', async () => {
    const user = userEvent.setup();
    await renderInHost();

    await user.press(screen.getByRole('button', { name: 'Abrir' }));

    expect(screen.getByRole('button', { name: 'Cerrar' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Abrir' })).toBeNull();
  });

  it('#193: while it closes it lets touches through, so the screen reopens it at once', async () => {
    const user = userEvent.setup();
    const onOpen = jest.fn();
    await renderInHost(onOpen);
    await user.press(screen.getByRole('button', { name: 'Abrir' }));

    await user.press(screen.getByRole('button', { name: 'Cerrar' }));
    // The exit animation is still running: the overlay is drawn but takes no touches.
    expect(screen.getByText('Cerrar', { includeHiddenElements: true })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Cerrar' })).toBeNull();
    await user.press(screen.getByRole('button', { name: 'Abrir' }));

    expect(onOpen).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('button', { name: 'Cerrar' })).toBeOnTheScreen();
  });

  it('removes the overlay once the exit animation ends', async () => {
    const user = userEvent.setup();
    await renderInHost();
    await user.press(screen.getByRole('button', { name: 'Abrir' }));

    await user.press(screen.getByRole('button', { name: 'Cerrar' }));
    await act(() => jest.runAllTimers());

    expect(screen.queryByText('Cerrar', { includeHiddenElements: true })).toBeNull();
    await user.press(screen.getByRole('button', { name: 'Abrir' }));
    expect(screen.getByRole('button', { name: 'Cerrar' })).toBeOnTheScreen();
  });

  it('Back closes the overlay on top', async () => {
    const back = jest.spyOn(BackHandler, 'addEventListener');
    const user = userEvent.setup();
    await renderInHost();
    await user.press(screen.getByRole('button', { name: 'Abrir' }));

    const onBack = back.mock.calls.at(-1)![1] as () => boolean;
    await act(async () => {
      expect(onBack()).toBe(true);
    });

    expect(screen.queryByRole('button', { name: 'Cerrar' })).toBeNull();
  });
});

describe('Overlay without a host', () => {
  it('is drawn in place, so a component renders alone in its tests', async () => {
    const user = userEvent.setup();
    await render(<Screen />);

    await user.press(screen.getByRole('button', { name: 'Abrir' }));

    expect(screen.getByRole('button', { name: 'Cerrar' })).toBeOnTheScreen();
  });
});
