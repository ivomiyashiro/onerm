import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { SCREEN_IDS, screenRoutes } from '../../src/presentation/features/dev/screen-routes';

const app = join(__dirname, '../../app');

/** The Expo Router file that serves a pathname: the tabs live in the (tabs) group. */
function routeFile(pathname: string): string | undefined {
  const name = pathname === '/' ? '/index' : pathname;
  return [join(app, `${name}.tsx`), join(app, '(tabs)', `${name}.tsx`)].find(existsSync);
}

describe('screen routes (08 §2)', () => {
  it('lists the 25 screens S01–S25', () => {
    expect(SCREEN_IDS).toEqual(
      Array.from({ length: 25 }, (_, i) => `S${String(i + 1).padStart(2, '0')}`),
    );
  });

  it.each(SCREEN_IDS)('%s has its route file in app/', (id) => {
    expect(routeFile(screenRoutes[id].pathname)).toBeDefined();
  });

  it('the sheets are S08, S10 and S11 (08 §2: «Hoja modal»)', () => {
    expect(SCREEN_IDS.filter((id) => screenRoutes[id].sheet)).toEqual(['S08', 'S10', 'S11']);
  });

  it.each(['/', '/routines', '/progress', '/profile'])('%s is a tab', (pathname) => {
    expect(routeFile(pathname)).toContain('(tabs)');
  });
});
