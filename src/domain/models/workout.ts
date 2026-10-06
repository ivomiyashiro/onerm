import type { Prescription } from '@/domain/models/prescription';
import type { Id, LoadType } from '@/domain/models/vocabulary';

/** A discarded workout is logically deleted: there is no `discarded` status (06 §3). */
export const WORKOUT_STATUSES = ['in_progress', 'finished'] as const;
export type WorkoutStatus = (typeof WORKOUT_STATUSES)[number];

export const WORKOUT_EXERCISE_STATUSES = ['pending', 'done', 'skipped'] as const;
export type WorkoutExerciseStatus = (typeof WORKOUT_EXERCISE_STATUSES)[number];

interface WorkoutSetBase {
  readonly id: Id;
  readonly workoutExerciseId: Id;
  readonly position: number;
  /** In kg, unrounded (RN-PERF-05). Null exactly when the exercise is bodyweight (I-06). */
  readonly loadKg: number | null;
  /** Warm-up sets are not effective (I-11, RN-ENT-12). */
  readonly isWarmup: boolean;
  readonly completedAt: Date;
}

/** RIR is optional; 5 means "5 or more" (RN-ENT-02). */
export interface BilateralSet extends WorkoutSetBase {
  readonly isUnilateral: false;
  readonly reps: number;
  readonly rir: number | null;
}

/** One load, reps and effort per side (ADR-0008). */
export interface UnilateralSet extends WorkoutSetBase {
  readonly isUnilateral: true;
  readonly repsLeft: number;
  readonly repsRight: number;
  readonly rirLeft: number | null;
  readonly rirRight: number | null;
}

/** A logged set. Each laterality has only its own fields (I-05). */
export type WorkoutSet = BilateralSet | UnilateralSet;

export interface WorkoutExercise {
  readonly id: Id;
  readonly workoutId: Id;
  /** Weak reference; null for an unplanned exercise. */
  readonly routineExerciseId: Id | null;
  /** The exercise the routine had when the workout started (RN-ENT-08). */
  readonly plannedExerciseId: Id | null;
  /** The exercise actually done. */
  readonly exerciseId: Id;
  readonly position: number;
  readonly status: WorkoutExerciseStatus;
  /** Copy taken at start: editing the routine doesn't rewrite history (RN-ENT-08, I-08). */
  readonly prescription: Prescription;
  /** Copies of the exercise attributes that define the set format (RN-ENT-08, RN-CAT-05). */
  readonly loadType: LoadType;
  readonly isUnilateral: boolean;
  readonly sets: readonly WorkoutSet[];
}

/** The workout aggregate (06 §2). Not a child of the routine: references are weak (RN-RUT-07). */
export interface Workout {
  readonly id: Id;
  readonly routineId: Id | null;
  readonly routineDayId: Id | null;
  readonly routineNameSnapshot: string;
  readonly dayNameSnapshot: string;
  readonly status: WorkoutStatus;
  readonly startedAt: Date;
  readonly finishedAt: Date | null;
  readonly notes: string | null;
  readonly exercises: readonly WorkoutExercise[];
}
