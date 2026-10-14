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
