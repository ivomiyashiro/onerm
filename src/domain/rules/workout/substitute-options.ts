import type { Exercise } from '@/domain/models/exercise';
import type { Id } from '@/domain/models/vocabulary';
import { NO_FILTERS, searchExercises } from '@/domain/rules/catalog-search';

export interface SubstituteOptions {
  /** Share a primary muscle with the original. */
  readonly sameMuscle: readonly Exercise[];
  readonly others: readonly Exercise[];
}

/**
 * RF-ENT-09.AC1 (S11): the exercises that match the search (RN-CAT-02), the ones with the same
 * primary muscle as the original first. The original itself is never offered.
 */
export function substituteOptions(
  catalog: readonly Exercise[],
  originalId: Id,
  query: string,
): SubstituteOptions {
  const muscles = catalog.find((e) => e.id === originalId)?.primaryMuscles ?? [];
  const found = searchExercises(catalog, { ...NO_FILTERS, query }).filter(
    (e) => e.id !== originalId,
  );
  const same = (e: Exercise) => e.primaryMuscles.some((m) => muscles.includes(m));
  return { sameMuscle: found.filter(same), others: found.filter((e) => !same(e)) };
}
