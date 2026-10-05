import type { Prescription } from '@/domain/models/prescription';
import type { RoutineExercise } from '@/domain/models/routine';
import type { Id } from '@/domain/models/vocabulary';
import type { Workout, WorkoutExercise, WorkoutSet } from '@/domain/models/workout';
import { limitingSide } from '@/domain/rules/limiting-side';
import { areLoadsEqual } from '@/domain/rules/load-equality';
import { sortByPosition } from '@/domain/rules/position-order';
import { isEffectiveSet } from '@/domain/rules/workout-set-rules';

/** An effective set as the engine sees it: a unilateral set by its limiting side (RN-ENT-06). */
export interface ExposureSet {
  readonly loadKg: number | null;
  readonly reps: number;
  readonly rir: number | null;
  /** The limiting side of a unilateral set; null for a bilateral one. */
  readonly side: 'left' | 'right' | null;
}

/**
 * The effective sets of one exercise in one finished workout (RN-SUG-01). Both kinds, EE and
 * ERR, share the shape; they differ in which workout exercises they take.
 */
export interface Exposure {
  readonly workoutId: Id;
  readonly exerciseId: Id;
  readonly startedAt: Date;
  readonly finishedAt: Date;
  /** The copy taken when the workout started (RN-ENT-08). */
  readonly prescription: Prescription;
  readonly sets: readonly ExposureSet[];
}

function toExposureSet(set: WorkoutSet): ExposureSet {
  if (!set.isUnilateral) {
    return { loadKg: set.loadKg, reps: set.reps, rir: set.rir, side: null };
  }
  const { side, reps, rir } = limitingSide(set);
  return { loadKg: set.loadKg, reps, rir, side };
}

/** One exposure per finished workout, from the workout exercises `belongs` picks. */
function exposures(
  workouts: readonly Workout[],
  belongs: (exercise: WorkoutExercise) => boolean,
): Exposure[] {
  const result: Exposure[] = [];
  for (const workout of workouts) {
    if (workout.status !== 'finished' || workout.finishedAt === null) continue;
    const exercises = sortByPosition(workout.exercises.filter(belongs));
    const sets = exercises
      .flatMap((exercise) => sortByPosition(exercise.sets))
      .filter(isEffectiveSet)
      .map(toExposureSet);
    // Skipped or without effective sets: neither a failure nor a success (RN-ENT-09).
    if (sets.length === 0) continue;
    result.push({
      workoutId: workout.id,
      exerciseId: exercises[0].exerciseId,
      startedAt: workout.startedAt,
      finishedAt: workout.finishedAt,
      prescription: exercises[0].prescription,
      sets,
    });
  }
  // RN-SUG-01: by finishedAt; the workout id breaks a tie so the order is deterministic.
  return result.sort(
    (a, b) =>
      a.finishedAt.getTime() - b.finishedAt.getTime() ||
      (a.workoutId < b.workoutId ? -1 : a.workoutId > b.workoutId ? 1 : 0),
  );
}

/** EE: the exercise in any context (routine, substitute, unplanned). For e1RM and history. */
export function exerciseExposures(exerciseId: Id, workouts: readonly Workout[]): Exposure[] {
  return exposures(workouts, (exercise) => exercise.exerciseId === exerciseId);
}

/**
 * ERR: the EE of the routine exercise with its current exercise. Substitutes (RN-ENT-10) and the
 * exercises before a change (RN-RUT-08) stay out. The unit of double progression.
 */
export function routineExposures(
  routineExercise: Pick<RoutineExercise, 'id' | 'exerciseId'>,
  workouts: readonly Workout[],
): Exposure[] {
  return exposures(
    workouts,
    (exercise) =>
      exercise.routineExerciseId === routineExercise.id &&
      exercise.exerciseId === routineExercise.exerciseId,
  );
}

/**
 * W (RN-SUG-01): the most used load among the effective sets, with the equality of RN-GEN-02; on
 * a tie, the highest. Null without load (bodyweight).
 */
export function workingLoad(exposure: Exposure): number | null {
  const { sets } = exposure;
  // The usual case: every set with the same load. One pass instead of comparing every pair.
  const first = sets[0]?.loadKg ?? null;
  if (first !== null && sets.every((set) => set.loadKg !== null && set.loadKg === first)) {
    return first;
  }
  let bestLoad: number | null = null;
  let bestUses = 0;
  for (const { loadKg } of sets) {
    if (loadKg === null) continue;
    let uses = 0;
    for (const other of sets) {
      if (other.loadKg !== null && areLoadsEqual(loadKg, other.loadKg)) uses++;
    }
    if (bestLoad === null || uses > bestUses || (uses === bestUses && loadKg > bestLoad)) {
      bestLoad = loadKg;
      bestUses = uses;
    }
  }
  return bestLoad;
}
