import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';

import { Dialog } from '@/presentation/components/overlay/dialog';

jest.useFakeTimers();

const actions = (onKeep = jest.fn(), onDiscard = jest.fn()) => [
  { label: 'Seguir entrenando', kind: 'safe' as const, onPress: onKeep },
  { label: 'Descartar', kind: 'destructive' as const, onPress: onDiscard },
];

describe('Dialog', () => {
  it('shows the title, the body and the actions in order', async () => {
    await render(
      <Dialog
        visible
        title="¿Descartar el entrenamiento?"
        body="Se borran las 9 series que registraste hoy. No se puede deshacer."
        actions={actions()}
        onDismiss={jest.fn()}
      />,
    );

    expect(screen.getByRole('header', { name: '¿Descartar el entrenamiento?' })).toBeOnTheScreen();
    expect(screen.getByText(/No se puede deshacer/)).toBeOnTheScreen();
    expect(screen.getAllByRole('button').map((b) => b.props.accessibilityLabel)).toEqual([
      'Seguir entrenando',
      'Descartar',
    ]);
  });

  it('calls the pressed action', async () => {
    const user = userEvent.setup();
    const onDiscard = jest.fn();
    await render(
      <Dialog
        visible
        title="¿Descartar?"
        actions={actions(jest.fn(), onDiscard)}
        onDismiss={jest.fn()}
      />,
    );

    await user.press(screen.getByRole('button', { name: 'Descartar' }));

    expect(onDiscard).toHaveBeenCalledTimes(1);
  });

  it('the back button dismisses it', async () => {
    const onDismiss = jest.fn();
    await render(
      <Dialog
        visible
        title="¿Descartar?"
        actions={actions()}
        onDismiss={onDismiss}
        testID="dialog"
      />,
    );

    await fireEvent(screen.getByTestId('dialog'), 'requestClose');

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('renders nothing when hidden', async () => {
    await render(
      <Dialog visible={false} title="¿Descartar?" actions={actions()} onDismiss={jest.fn()} />,
    );

    expect(screen.queryByText('¿Descartar?')).toBeNull();
  });
});
