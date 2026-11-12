import type { WorkoutExercise } from '@/domain/models/workout';

/**
 * RN-ENT-10: compared against the planned exercise copied at start, not the current routine, so
 * changing the routine never rewrites history (RN-RUT-08). An unplanned exercise has no planned
 * exercise and is not a substitution.
 */
export function isSubstitution(
  exercise: Pick<WorkoutExercise, 'plannedExerciseId' | 'exerciseId'>,
): boolean {
  return exercise.plannedExerciseId !== null && exercise.exerciseId !== exercise.plannedExerciseId;
}
