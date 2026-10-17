import type { Id } from '@/domain/models/vocabulary';
import type { Workout } from '@/domain/models/workout';
import { sortByPosition } from '@/domain/rules/position-order';

/**
 * #195: the last load the user logged in this exercise, for the set sheet: in the workout in
 * progress first, then in the most recent finished workout that has it. Null without one.
 */
export function lastLoadKg(
  exerciseId: Id,
  inProgress: Workout,
  finished: readonly Workout[],
): number | null {
  const newestFirst = [...finished].sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
  for (const workout of [inProgress, ...newestFirst]) {
    const loads = workout.exercises
      .filter((e) => e.exerciseId === exerciseId)
      .flatMap((e) => sortByPosition(e.sets))
      .map((set) => set.loadKg)
      .filter((load): load is number => load !== null);
    if (loads.length > 0) return loads[loads.length - 1];
  }
  return null;
}
