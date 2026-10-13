import type { Id } from '@/domain/models/vocabulary';
import type { Workout } from '@/domain/models/workout';

/** RF-ENT-01.AC3: when each day of the routine was last finished; days never done are absent. */
export function lastDoneByDay(routineId: Id, workouts: readonly Workout[]): Map<Id, Date> {
  const lastDone = new Map<Id, Date>();
  for (const { routineId: of, routineDayId, status, finishedAt } of workouts) {
    if (of !== routineId || status !== 'finished' || routineDayId === null || finishedAt === null)
      continue;
    const known = lastDone.get(routineDayId);
    if (known === undefined || finishedAt > known) lastDone.set(routineDayId, finishedAt);
  }
  return lastDone;
}
