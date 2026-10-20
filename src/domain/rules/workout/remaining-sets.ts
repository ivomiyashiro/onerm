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
 * Whether the workout still waits for this exercise: it has sets left, it isn't skipped and the
 * user didn't move on from it without sets (`passedOver`, RF-ENT-08.AC1).
 */
export function isOpen(
  exercise: WorkoutExercise,
  extra = 0,
  passedOver: ReadonlySet<string> = NONE,
): boolean {
  return (
    exercise.status !== 'skipped' &&
    !passedOver.has(exercise.id) &&
    remainingSets(exercise, extra) > 0
  );
}

const NONE: ReadonlySet<string> = new Set();

/**
 * RF-ENT-02.AC7: the next open exercise after `from`, in order and wrapping around, never `from`
 * itself (its last set was just logged); null when no other is open. Skipped exercises are left
 * out, and so are the ones passed over that lie behind `from` (RF-ENT-08.AC1): the ones ahead are
 * still next, because looking at them on the way isn't skipping them. `extra` gives the extra
 * sets of each exercise.
 */
export function firstIncomplete(
  exercises: readonly WorkoutExercise[],
  from: number,
  extra: (exercise: WorkoutExercise) => number = () => 0,
  passedOver: ReadonlySet<string> = NONE,
): number | null {
  for (let step = 1; step < exercises.length; step++) {
    const index = (from + step) % exercises.length;
    const exercise = exercises[index];
    const behind = index < from;
    if (isOpen(exercise, extra(exercise), behind ? passedOver : NONE)) return index;
  }
  return null;
}
