import type { Id } from '@/domain/models/vocabulary';
import type { Workout } from '@/domain/models/workout';
import { personalRecords, workoutRecords } from '@/domain/rules/progress/personal-records';
import { sortByPosition } from '@/domain/rules/shared/position-order';
import type { E1rm } from '@/domain/rules/suggestion/e1rm';
import { exerciseExposures } from '@/domain/rules/suggestion/exposures';

/** A record of RN-PROG-03 (a) or (b) beaten in the workout (RF-PROG-05.AC2). */
export type SummaryRecord =
  | {
      readonly kind: 'heaviestLoad';
      readonly name: string | null;
      readonly loadKg: number;
      readonly reps: number;
    }
  | { readonly kind: 'e1rm'; readonly name: string | null; readonly e1rm: E1rm };

/**
 * RN-PROG-03 (a) and (b) beaten by `workout`, by exercise in its order (S12, S19). Only with an
 * earlier EE of that exercise.
 */
export function recordsOf(
  workout: Workout,
  finished: readonly Workout[],
  nameOf: (exerciseId: Id) => string | null,
): SummaryRecord[] {
  const records: SummaryRecord[] = [];
  for (const exerciseId of new Set(sortByPosition(workout.exercises).map((e) => e.exerciseId))) {
    const exposures = exerciseExposures(exerciseId, finished);
    const beaten = workoutRecords(exposures, workout.id);
    const today = personalRecords(exposures.filter((e) => e.workoutId === workout.id));
    const name = nameOf(exerciseId);
    if (beaten.heaviestLoad && today.heaviestLoad) {
      const { loadKg, reps } = today.heaviestLoad;
      records.push({ kind: 'heaviestLoad', name, loadKg, reps });
    }
    if (beaten.e1rm && today.bestE1rm) {
      records.push({ kind: 'e1rm', name, e1rm: today.bestE1rm.e1rm });
    }
  }
  return records;
}
