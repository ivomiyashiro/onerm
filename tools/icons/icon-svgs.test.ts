import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { iconNames } from '../../src/presentation/components/icons/icon';

// The color prop only works because .svgrrc.js turns #F4F4EF into currentColor: an icon exported
// with any other color would ignore it, and the render tests above would not notice.
describe('icon SVG files', () => {
  const dir = join(__dirname, '../../src/presentation/components/icons/svg');
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
