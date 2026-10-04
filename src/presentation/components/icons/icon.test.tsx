import { render, screen } from '@testing-library/react-native';

import { Icon, iconNames } from '@/presentation/components/icons/icon';
import { colors } from '@/presentation/theme';

describe('Icon', () => {
  it.each(iconNames)('%s renders at 24 dp in the given color', async (name) => {
    await render(<Icon name={name} color={colors.textAccent} testID="icon" />);

    const svg = screen.getByTestId('icon', { includeHiddenElements: true });
    expect(svg.props).toMatchObject({ width: 24, height: 24, color: colors.textAccent });
  });

  it('accepts another size', async () => {
    await render(<Icon name="check" size={20} color={colors.textPrimary} testID="icon" />);

    expect(screen.getByTestId('icon', { includeHiddenElements: true }).props).toMatchObject({
      width: 20,
      height: 20,
    });
  });

  it('is hidden from the screen reader: the control around it carries the label', async () => {
    await render(<Icon name="plus" color={colors.textPrimary} testID="icon" />);

    expect(screen.getByTestId('icon', { includeHiddenElements: true }).props).toMatchObject({
      accessible: false,
      importantForAccessibility: 'no-hide-descendants',
    });
  });
});
