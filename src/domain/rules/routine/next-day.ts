import type { Id } from '@/domain/models/vocabulary';
import type { Workout } from '@/domain/models/workout';
import { sortByPosition } from '@/domain/rules/position-order';

/** A routine day for the rotation, deleted ones included: their position still counts. */
export interface RotationDay {
  readonly id: Id;
  readonly position: number;
  readonly isDeleted: boolean;
}

/**
 * RN-RUT-01 (ADR-0006): the first live day after the day of the last finished workout of the
 * routine, circular. That day counts even if it was deleted later; positions are not compacted.
 * Never trained with the routine (or its day is unknown) → the first live day. A derived value:
 * never stored (RN-SYNC-10).
 */
export function nextDay(
  routineId: Id,
  days: readonly RotationDay[],
  workouts: readonly Workout[],
): Id | null {
  const live = sortByPosition(days.filter((day) => !day.isDeleted));
  if (live.length === 0) return null;

  let last: Workout | null = null;
  for (const workout of workouts) {
    if (workout.routineId !== routineId || workout.status !== 'finished') continue;
    if (workout.finishedAt === null) continue;
    if (last === null || last.finishedAt === null || workout.finishedAt > last.finishedAt) {
      last = workout;
    }
  }
  const lastDay = days.find((day) => day.id === last?.routineDayId);
  if (lastDay === undefined) return live[0].id;

  const after = live.find(
    (day) =>
      day.position > lastDay.position || (day.position === lastDay.position && day.id > lastDay.id),
  );
  return (after ?? live[0]).id;
}
