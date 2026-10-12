import { render, screen, userEvent } from '@testing-library/react-native';

import { SearchField } from '@/presentation/components/input/search-field';

jest.useFakeTimers();

function renderField(value: string, onChangeText = jest.fn()) {
  return render(
    <SearchField
      label="Buscar ejercicio"
      clearLabel="Borrar"
      value={value}
      onChangeText={onChangeText}
    />,
  );
}

describe('SearchField', () => {
  it('is named by its label and passes the text up', async () => {
    const user = userEvent.setup();
    const onChangeText = jest.fn();
    await renderField('', onChangeText);

    await user.type(screen.getByLabelText('Buscar ejercicio'), 'p');

    expect(onChangeText).toHaveBeenCalledWith('p');
  });

  it('shows the label as placeholder', async () => {
    await renderField('');

    expect(screen.getByPlaceholderText('Buscar ejercicio')).toBeOnTheScreen();
  });

  it('has no clear button while empty', async () => {
    await renderField('');

    expect(screen.queryByRole('button', { name: 'Borrar' })).not.toBeOnTheScreen();
  });

  it('the clear button empties the text', async () => {
    const user = userEvent.setup();
    const onChangeText = jest.fn();
    await renderField('press', onChangeText);

    await user.press(screen.getByRole('button', { name: 'Borrar' }));

    expect(onChangeText).toHaveBeenCalledWith('');
  });
});
