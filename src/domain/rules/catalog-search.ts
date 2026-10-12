import type { Exercise } from '@/domain/models/exercise';
import type { Equipment, Muscle } from '@/domain/models/vocabulary';

/** The filters of the exercise search (RF-CAT-01 AC3). An empty list does not filter. */
export interface CatalogFilters {
  readonly muscles: readonly Muscle[];
  readonly equipment: readonly Equipment[];
}

export interface CatalogSearch extends CatalogFilters {
  readonly query: string;
}

export const NO_FILTERS: CatalogFilters = { muscles: [], equipment: [] };

/**
 * RF-CAT-01: the exercises that match the search, by name.
 * - RN-CAT-02: case and accents are ignored, and every word of the query has to appear, in any
 *   order, in the name or in an alias. A word may be part of a longer one, so results update
 *   while typing.
 * - RN-CAT-03: muscles match the primary muscles and equipment matches the equipment list. Values
 *   of the same filter add up (OR); different filters and the text have to match together (AND).
 * - RN-CAT-01: deprecated exercises are never found.
 */
export function searchExercises(exercises: readonly Exercise[], search: CatalogSearch): Exercise[] {
  const words = normalize(search.query).split(' ').filter(Boolean);

  return exercises
    .filter(
      (exercise) =>
        exercise.deprecatedAt === null &&
        matchesAny(exercise.primaryMuscles, search.muscles) &&
        matchesAny(exercise.equipment, search.equipment) &&
        matchesWords(exercise, words),
    )
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

function matchesAny<T>(values: readonly T[], wanted: readonly T[]): boolean {
  return wanted.length === 0 || wanted.some((value) => values.includes(value));
}

function matchesWords(exercise: Exercise, words: readonly string[]): boolean {
  if (words.length === 0) return true;
  const texts = [exercise.name, ...exercise.aliases].map(normalize);
  return words.every((word) => texts.some((text) => text.includes(word)));
}

/** Lower case, without accents and with single spaces: "Jalón  al" → "jalon al". */
function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}
