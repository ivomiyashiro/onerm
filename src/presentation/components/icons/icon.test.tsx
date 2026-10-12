import { render, screen } from '@testing-library/react-native';

import { Icon } from '@/presentation/components/icons/icon';
import { colors } from '@/presentation/theme';

describe('Icon', () => {
  it('is hidden from the screen reader: the control around it carries the label', async () => {
    await render(<Icon name="plus" color={colors.textPrimary} testID="icon" />);

    expect(screen.getByTestId('icon', { includeHiddenElements: true }).props).toMatchObject({
      accessible: false,
      importantForAccessibility: 'no-hide-descendants',
    });
  });
});
