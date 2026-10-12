import { render, screen } from '@testing-library/react-native';

import { Notice } from '@/presentation/components/feedback/notice';

describe('Notice', () => {
  it('shows its message', async () => {
    await render(<Notice message="Este ejercicio ya no está en el catálogo." />);

    expect(screen.getByText('Este ejercicio ya no está en el catálogo.')).toBeOnTheScreen();
  });
});
