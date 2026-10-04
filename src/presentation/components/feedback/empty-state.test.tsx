import { render, screen, userEvent } from '@testing-library/react-native';

import { EmptyState } from '@/presentation/components/feedback/empty-state';

jest.useFakeTimers();

describe('EmptyState', () => {
  it('shows the title and the body', async () => {
    await render(
      <EmptyState
        icon="search"
        title="No encontramos ejercicios"
        body="Probá con otra palabra o sacá algún filtro."
      />,
    );

    expect(screen.getByText('No encontramos ejercicios')).toBeOnTheScreen();
    expect(screen.getByText('Probá con otra palabra o sacá algún filtro.')).toBeOnTheScreen();
  });

  it('offers its action', async () => {
    const user = userEvent.setup();
    const onPress = jest.fn();
    await render(
      <EmptyState
        icon="search"
        title="No encontramos ejercicios"
        action={{ label: 'Limpiar filtros', onPress }}
      />,
    );

    await user.press(screen.getByRole('button', { name: 'Limpiar filtros' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
