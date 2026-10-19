import type { Id } from '@/domain/models/vocabulary';
import type { Workout } from '@/domain/models/workout';
import { sortByPosition } from '@/domain/rules/position-order';

/**
 * #195: the last working load the user logged in this exercise, for the set sheet: in the first
 * of `newestFirst` that has it (the caller puts the workout in progress first, then the finished
 * ones). Warm-ups don't count (RN-ENT-12). Null without one.
 */
export function lastLoadKg(exerciseId: Id, newestFirst: readonly Workout[]): number | null {
  for (const workout of newestFirst) {
    const loads = workout.exercises
      .filter((e) => e.exerciseId === exerciseId)
      .flatMap((e) => sortByPosition(e.sets))
      .filter((set) => !set.isWarmup)
      .map((set) => set.loadKg)
      .filter((load): load is number => load !== null);
    if (loads.length > 0) return loads[loads.length - 1];
  }
  return null;
}
