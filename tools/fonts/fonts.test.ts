import { existsSync } from 'node:fs';
import { join } from 'node:path';

import config from '../../app.config';
import { fonts } from '../../src/presentation/theme/typography';

// On Android the fontFamily is the file name, so each theme font needs its file embedded by the
// expo-font config plugin. A missing one falls back to the system font without any error.
describe('embedded fonts', () => {
  const plugin = config.plugins?.find((p) => Array.isArray(p) && p[0] === 'expo-font');
  const embedded: string[] = Array.isArray(plugin) ? plugin[1].fonts : [];

  it.each(Object.values(fonts))('%s is embedded and exists', (family) => {
    const path = `./assets/fonts/${family}.ttf`;

    expect(embedded).toContain(path);
    expect(existsSync(join(__dirname, '../..', path))).toBe(true);
  });
});
