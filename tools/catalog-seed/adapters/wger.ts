import type { Equipment, Muscle } from '@/domain/models/vocabulary';

import type { ExerciseSourceAdapter, MapResult } from '../types';

const API = 'https://wger.de/api/v2/exerciseinfo/';
const SPANISH = 4;
const ENGLISH = 2;
const PAGE_SIZE = 100;

/** wger muscle ids to our vocabulary (RN-CAT-03). The serratus (3) has no equivalent. */
const MUSCLES: Readonly<Record<number, Muscle>> = {
  1: 'biceps',
  2: 'shoulders',
  4: 'chest',
  5: 'triceps',
  6: 'abs',
  7: 'calves',
  8: 'glutes',
  9: 'back',
  10: 'quads',
  11: 'hamstrings',
  12: 'back',
  13: 'biceps',
  14: 'abs',
  15: 'calves',
};

/** wger equipment names to ours. */
const EQUIPMENT: Readonly<Record<string, Equipment>> = {
  barbell: 'barbell',
  'sz-bar': 'barbell',
  dumbbell: 'dumbbell',
  kettlebell: 'kettlebell',
  'cable machine': 'cable',
  'none (bodyweight exercise)': 'bodyweight',
};

/** Furniture that doesn't define how the load is moved: it is ignored, not rejected. */
const SUPPORT_EQUIPMENT = new Set(['bench', 'incline bench', 'gym mat']);

interface WgerTranslation {
  readonly language: number;
  readonly name: string;
  readonly description?: string;
  readonly aliases?: readonly { readonly alias: string }[];
}

interface WgerExercise {
  readonly id: number;
  readonly muscles: readonly { readonly id: number; readonly name: string }[];
  readonly muscles_secondary: readonly { readonly id: number; readonly name: string }[];
  readonly equipment: readonly { readonly name: string }[];
  readonly translations: readonly WgerTranslation[];
  readonly license: { readonly short_name: string; readonly url: string };
  readonly license_author: string | null;
}

interface WgerPage {
  readonly next: string | null;
  readonly results: unknown[];
}

/** The exercises of wger with a Spanish translation (the app is in Spanish). */
export function wgerAdapter(fetchFn: typeof fetch = fetch): ExerciseSourceAdapter {
  return {
    sourceId: 'wger',
    async *extract() {
      let url: string | null = `${API}?language=${SPANISH}&limit=${PAGE_SIZE}&format=json`;
      while (url) {
        const response = await fetchFn(url);
        if (!response.ok) throw new Error(`wger answered ${response.status} for ${url}`);
        const page = (await response.json()) as WgerPage;
        yield* page.results;
        url = page.next;
      }
    },
    map: mapWgerExercise,
  };
}

function reject(raw: WgerExercise, reason: string): MapResult {
  return { ok: false, externalId: String(raw.id), reason };
}

export function mapWgerExercise(input: unknown): MapResult {
  const raw = input as WgerExercise;

  const muscles = new Map<'primary' | 'secondary', Muscle[]>([
    ['primary', []],
    ['secondary', []],
  ]);
  for (const [kind, list] of [
    ['primary', raw.muscles],
    ['secondary', raw.muscles_secondary],
  ] as const) {
    for (const muscle of list) {
      const mapped = MUSCLES[muscle.id];
      if (!mapped) return reject(raw, `unmapped muscle "${muscle.name}" (id ${muscle.id})`);
      if (!muscles.get(kind)!.includes(mapped)) muscles.get(kind)!.push(mapped);
    }
  }

  const equipment: Equipment[] = [];
  for (const item of raw.equipment) {
    const key = item.name.toLowerCase();
    if (SUPPORT_EQUIPMENT.has(key)) continue;
    const mapped = EQUIPMENT[key];
    if (!mapped) return reject(raw, `unmapped equipment "${item.name}"`);
    if (!equipment.includes(mapped)) equipment.push(mapped);
  }

  const spanish = raw.translations.find((t) => t.language === SPANISH);
  const english = raw.translations.find((t) => t.language === ENGLISH);
  const description = spanish?.description ? stripHtml(spanish.description) : null;
  // The attribution never carries an email: wger fills some author fields with one.
  const author =
    raw.license_author && !raw.license_author.includes('@') ? raw.license_author : null;

  return {
    ok: true,
    candidate: {
      source: 'wger',
      externalId: String(raw.id),
      name: spanish?.name ?? null,
      aliases: english ? [english.name] : [],
      loadType:
        equipment.length > 0 && equipment.every((e) => e === 'bodyweight')
          ? 'bodyweight'
          : 'external',
      primaryMuscles: muscles.get('primary')!,
      secondaryMuscles: muscles.get('secondary')!,
      primaryEquipment: equipment[0] ?? null,
      equipment,
      mechanic: null,
      isUnilateral: null,
      description,
      attribution: {
        source: 'wger',
        license: raw.license.short_name,
        attribution: `${author ?? 'wger community'} · ${raw.license.url} · https://wger.de/en/exercise/${raw.id}/view`,
      },
    },
  };
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
