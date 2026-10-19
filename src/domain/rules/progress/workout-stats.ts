import type { Workout } from '@/domain/models/workout';
import { isEffectiveSet } from '@/domain/rules/workout-set-rules';

/** Whole minutes from start to finish; never negative, even after a correction. */
export function workoutMinutes(workout: Pick<Workout, 'startedAt' | 'finishedAt'>): number {
  if (workout.finishedAt === null) return 0;
  return Math.max(
    0,
    Math.round((workout.finishedAt.getTime() - workout.startedAt.getTime()) / 60_000),
  );
}

/** The effective sets of a workout (RN-SUG-01): what S12, S18 and S19 count as «series». */
export function effectiveSets(workout: Pick<Workout, 'exercises'>): number {
  return workout.exercises.reduce((n, e) => n + e.sets.filter(isEffectiveSet).length, 0);
}

/**
 * RN-ENT-13: the total load (tonnage) of a workout, load × reps of its effective sets; a
 * unilateral set adds both sides. Bodyweight sets have no load and add nothing: null when no
 * effective set has one. Not the weekly volume (RN-PROG-04).
 */
export function totalLoadKg(workout: Pick<Workout, 'exercises'>): number | null {
  let total: number | null = null;
  for (const set of workout.exercises.flatMap((e) => e.sets).filter(isEffectiveSet)) {
    if (set.loadKg === null) continue;
    const reps = set.isUnilateral ? set.repsLeft + set.repsRight : set.reps;
    total = (total ?? 0) + set.loadKg * reps;
  }
  return total;
}
