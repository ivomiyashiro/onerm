import type { Id } from '@/domain/models/vocabulary';
import type { Workout, WorkoutExercise, WorkoutSet } from '@/domain/models/workout';
import { sortByPosition } from '@/domain/rules/shared/position-order';
import { isEffectiveSet } from '@/domain/rules/workout/workout-set-rules';

/**
 * RN-ENT-09: an exercise with effective sets is done, also after being skipped. Without them it
 * goes back to pending, or stays skipped; in a finished workout it is skipped.
 */
export function withSets(
  workout: Workout,
  exercise: WorkoutExercise,
  sets: readonly WorkoutSet[],
): WorkoutExercise {
  const sorted = sortByPosition(sets);
  const status = sorted.some(isEffectiveSet)
    ? 'done'
    : exercise.status === 'skipped' || workout.status === 'finished'
      ? 'skipped'
      : 'pending';
  return { ...exercise, status, sets: sorted };
}

export function replaceExercise(workout: Workout, exercise: WorkoutExercise): Workout {
  return {
    ...workout,
    exercises: workout.exercises.map((e) => (e.id === exercise.id ? exercise : e)),
  };
}

/** The exercise of the workout that holds the set, if any. */
export function exerciseOfSet(workout: Workout, setId: Id) {
  return workout.exercises.find((e) => e.sets.some((s) => s.id === setId));
}
