import { profile } from '@/presentation/strings/profile';

/** A third-party source the app uses, with its license and a link (RF-CAT-05). */
export interface Credit {
  readonly title: string;
  readonly detail: string;
  readonly url: string;
}

/**
 * Only what the app ships today (decided 2026-10-12, #31): the catalog is curated by the team, so
 * the wger row arrives with its seed (F6, ADR-0004 R1), and the photos row with the photos.
 */
export const CREDITS: readonly Credit[] = [
  {
    title: profile.about.fonts,
    detail: profile.about.fontsCredit,
    url: 'https://openfontlicense.org',
  },
];
