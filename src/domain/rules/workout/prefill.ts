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
 * don't count as the previous set, they are lighter on purpose (RN-ENT-12). A suggestion
 * `recalculated` from the previous set (a calibration step, RN-SUG-06) is shown as is.
 */
export function prefill(
  suggestion: Suggestion,
  sets: readonly WorkoutSet[],
  recalculated = false,
): PrefilledSet {
  if (recalculated) return { loadKg: suggestion.loadKg, reps: suggestion.reps };
  const previous = sets.filter((set) => !set.isWarmup).at(-1);
  const used = previous?.loadKg ?? null;
  const changed =
    used !== null && (suggestion.loadKg === null || !areLoadsEqual(used, suggestion.loadKg));
  return { loadKg: changed ? used : suggestion.loadKg, reps: suggestion.reps };
}
