import type { Id } from '@/domain/models/vocabulary';
import type { Workout } from '@/domain/models/workout';
import { sortByPosition } from '@/domain/rules/position-order';

/**
 * #195: the last working load the user logged in this exercise, for the set sheet: in the workout
 * in progress first, then in the most recent finished workout that has it. Warm-ups don't count
 * (RN-ENT-12). Null without one. `finishedNewestFirst`: sorted once by the caller.
 */
export function lastLoadKg(
  exerciseId: Id,
  inProgress: Workout,
  finishedNewestFirst: readonly Workout[],
): number | null {
  for (const workout of [inProgress, ...finishedNewestFirst]) {
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
