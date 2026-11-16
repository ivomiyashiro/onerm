import type { WorkoutSet } from '@/domain/models/workout';
import type { PrefilledSet } from '@/domain/rules/workout/prefill';

/** The values of a logged set to start another with (RF-ENT-05): a unilateral one by its weaker side. */
export function valuesOf(set: WorkoutSet): PrefilledSet {
  return {
    loadKg: set.loadKg,
    reps: set.isUnilateral ? Math.min(set.repsLeft, set.repsRight) : set.reps,
  };
}

/** Whether the set has its effort: both sides for a unilateral one. */
export function hasEffort(set: WorkoutSet): boolean {
  return set.isUnilateral ? set.rirLeft !== null && set.rirRight !== null : set.rir !== null;
}
