import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

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

// The color prop only works because .svgrrc.js turns #F4F4EF into currentColor: an icon exported
// with any other color would ignore it, and the render tests above would not notice.
describe('icon SVG files', () => {
  const dir = join(__dirname, 'svg');
  const files = readdirSync(dir).filter((file) => file.endsWith('.svg'));

  it('there is one file per icon name', () => {
    expect(files.map((file) => file.replace('.svg', '')).sort()).toEqual([...iconNames].sort());
  });

  it.each(files)('%s is drawn only in #F4F4EF', (file) => {
    const colors = readFileSync(join(dir, file), 'utf8').match(/(?:stroke|fill)="([^"]+)"/g) ?? [];
    for (const attribute of colors) {
      expect(attribute).toMatch(/="(#F4F4EF|none)"/);
    }
  });
});
