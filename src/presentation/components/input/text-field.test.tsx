import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { TextField } from '@/presentation/components/input/text-field';
import { colors } from '@/presentation/theme';

jest.useFakeTimers();

const fieldStyle = () => StyleSheet.flatten(screen.getByTestId('text-field-box').props.style);

describe('TextField', () => {
  it('is named by its label and passes the text up', async () => {
    const user = userEvent.setup();
    const onChangeText = jest.fn();
    await render(<TextField label="Correo electrónico" value="" onChangeText={onChangeText} />);

    await user.type(screen.getByLabelText('Correo electrónico'), 'a');

    expect(onChangeText).toHaveBeenCalledWith('a');
  });

  it('shows the help text and is 52 dp tall', async () => {
    await render(
      <TextField
        label="Correo electrónico"
        value=""
        onChangeText={jest.fn()}
        help="Te mandamos un enlace para entrar."
      />,
    );

    expect(screen.getByText('Te mandamos un enlace para entrar.')).toBeOnTheScreen();
    expect(fieldStyle()).toMatchObject({ minHeight: 52, borderColor: colors.borderControl });
  });

  it('on focus the border turns lime', async () => {
    await render(<TextField label="Correo electrónico" value="" onChangeText={jest.fn()} />);

    await fireEvent(screen.getByLabelText('Correo electrónico'), 'focus');

    expect(fieldStyle()).toMatchObject({ borderColor: colors.borderAccent });
  });

  it('an error replaces the help, turns the border red and is announced', async () => {
    await render(
      <TextField
        label="Correo electrónico"
        value="ivo"
        onChangeText={jest.fn()}
        help="Te mandamos un enlace para entrar."
        error="Revisá el correo: falta el @."
      />,
    );

    expect(screen.queryByText('Te mandamos un enlace para entrar.')).toBeNull();
    const error = screen.getByText('Revisá el correo: falta el @.');
    expect(error).toHaveStyle({ color: colors.textErr });
    expect(error.props.accessibilityLiveRegion).toBe('polite');
    expect(fieldStyle()).toMatchObject({ borderColor: colors.borderErr });
  });

  it('when disabled it is not editable', async () => {
    await render(
      <TextField
        label="Correo electrónico"
        value="ivo@correo.com"
        onChangeText={jest.fn()}
        disabled
      />,
    );

    expect(screen.getByLabelText('Correo electrónico')).toBeDisabled();
    expect(fieldStyle()).toMatchObject({ borderStyle: 'dashed' });
  });
});
