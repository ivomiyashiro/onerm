import type { WorkoutExercise } from '@/domain/models/workout';

/**
 * The prescribed sets still to log, plus the extra ones added (RF-ENT-05). Warm-ups are not
 * prescribed sets (RN-ENT-12); a set with 0 reps was done, so it counts.
 */
export function remainingSets(exercise: WorkoutExercise, extra = 0): number {
  const logged = exercise.sets.filter((set) => !set.isWarmup).length;
  return Math.max(0, exercise.prescription.sets + extra - logged);
}

/**
 * RF-ENT-02.AC7: the next exercise with sets left after `from`, in order and wrapping around,
 * never `from` itself (its last set was just logged); null when no other has sets left. `extra`
 * gives the extra sets of each exercise.
 */
export function firstIncomplete(
  exercises: readonly WorkoutExercise[],
  from: number,
  extra: (exercise: WorkoutExercise) => number = () => 0,
): number | null {
  for (let step = 1; step < exercises.length; step++) {
    const index = (from + step) % exercises.length;
    if (remainingSets(exercises[index], extra(exercises[index])) > 0) return index;
  }
  return null;
}
