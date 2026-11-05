/** Every screen of 08 §2, with the route that shows it. */
export const SCREEN_IDS = [
  'S01',
  'S02',
  'S03',
  'S04',
  'S05',
  'S06',
  'S07',
  'S08',
  'S09',
  'S10',
  'S11',
  'S12',
  'S13',
  'S14',
  'S15',
  'S16',
  'S17',
  'S18',
  'S19',
  'S20',
  'S21',
  'S22',
  'S23',
  'S24',
  'S25',
] as const;

export type ScreenId = (typeof SCREEN_IDS)[number];

export interface ScreenRoute {
  /** Expo Router path, with `[param]` segments for dynamic routes. */
  pathname: string;
  /** Example params for the development list. */
  params?: Record<string, string>;
  /** Shown over the current screen as a sheet. */
  sheet?: boolean;
}

export const screenRoutes: Record<ScreenId, ScreenRoute> = {
  S01: { pathname: '/welcome' },
  S02: { pathname: '/sign-in' },
  S03: { pathname: '/sign-up' },
  S04: { pathname: '/forgot-password' },
  S05: { pathname: '/onboarding' },
  S06: { pathname: '/recommendation' },
  S07: { pathname: '/' },
  S08: { pathname: '/choose-day', sheet: true },
  S09: { pathname: '/workout' },
  S10: { pathname: '/suggestion-reason', sheet: true },
  S11: { pathname: '/substitute-exercise', sheet: true },
  S12: { pathname: '/workout-summary' },
  S13: { pathname: '/routines' },
  S14: { pathname: '/template/[id]', params: { id: 'PLT-FB3' } },
  S15: { pathname: '/routine-editor/[id]', params: { id: 'new' } },
  S16: { pathname: '/exercises' },
  S17: { pathname: '/exercise/[id]', params: { id: 'barbell-back-squat' } },
  S18: { pathname: '/progress' },
  S19: { pathname: '/workout-detail/[id]', params: { id: 'example' } },
  S20: { pathname: '/exercise-progress/[id]', params: { id: 'barbell-back-squat' } },
  S21: { pathname: '/profile' },
  S22: { pathname: '/about' },
  S23: { pathname: '/restoring' },
  S24: { pathname: '/new-password' },
  S25: { pathname: '/sync-conflicts' },
};
