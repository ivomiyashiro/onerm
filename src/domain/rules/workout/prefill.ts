import type { WorkoutSet } from '@/domain/models/workout';
import { areLoadsEqual } from '@/domain/rules/load-equality';
import type { Suggestion } from '@/domain/rules/suggestion/suggestion';

/** The values a new set starts with; for a unilateral one the reps go to both sides. */
export interface PrefilledSet {
  /** Null with no load to show: bodyweight, or the first set of a calibration ("—"). */
  readonly loadKg: number | null;
  readonly reps: number;
}

/**
 * RN-ENT-04: the suggestion, unless the previous set used another load: then that load. Warm-ups
 * don't count as the previous set, they are lighter on purpose (RN-ENT-12). The calibration steps
 * of RN-SUG-06 come with #35; until then, its next sets keep the load used.
 */
export function prefill(suggestion: Suggestion, sets: readonly WorkoutSet[]): PrefilledSet {
  const previous = sets.filter((set) => !set.isWarmup).at(-1);
  const used = previous?.loadKg ?? null;
  const changed =
    used !== null && (suggestion.loadKg === null || !areLoadsEqual(used, suggestion.loadKg));
  return { loadKg: changed ? used : suggestion.loadKg, reps: suggestion.reps };
}
