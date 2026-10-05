import type { Exercise } from '@/domain/models/exercise';
import type { LocalDate } from '@/domain/models/local-date';
import { MUSCLES, type Id, type Muscle } from '@/domain/models/vocabulary';
import type { Workout } from '@/domain/models/workout';
import { addDays } from '@/domain/rules/calendar';
import { isEffectiveSet } from '@/domain/rules/workout-set-rules';

/** P-03: a direct set counts 1, an indirect one 0.5. */
const PRIMARY_SET = 1;
const SECONDARY_SET = 0.5;

/**
 * RN-PROG-04: the fractional sets per muscle of the finished workouts of the week that starts
 * on `weekStart` (a Monday, RN-GEN-01). Each effective set adds 1 to each primary muscle and 0.5 to
 * each secondary one; a unilateral set is 1 set (ADR-0008). The muscles come from the catalog: an
 * exercise not there yet (RN-CAT-04) adds nothing.
 */
export function weeklyVolume(
  workouts: readonly Workout[],
  exercises: ReadonlyMap<Id, Pick<Exercise, 'primaryMuscles' | 'secondaryMuscles'>>,
  weekStart: LocalDate,
  localDate: (instant: Date) => LocalDate,
): Record<Muscle, number> {
  const volume = Object.fromEntries(MUSCLES.map((muscle) => [muscle, 0])) as Record<Muscle, number>;
  const weekEnd = addDays(weekStart, 6);

  for (const workout of workouts) {
    if (workout.status !== 'finished' || workout.finishedAt === null) continue;
    const date = localDate(workout.finishedAt);
    if (date < weekStart || date > weekEnd) continue;
    for (const workoutExercise of workout.exercises) {
      const exercise = exercises.get(workoutExercise.exerciseId);
      if (exercise === undefined) continue;
      const sets = workoutExercise.sets.filter(isEffectiveSet).length;
      exercise.primaryMuscles.forEach((muscle) => (volume[muscle] += sets * PRIMARY_SET));
      exercise.secondaryMuscles.forEach((muscle) => (volume[muscle] += sets * SECONDARY_SET));
    }
  }
  return volume;
}
