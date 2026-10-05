import type { WorkoutExercise, WorkoutSet } from '@/domain/models/workout';
import { limitingSide } from '@/domain/rules/limiting-side';
import { isWholeBetween } from '@/domain/rules/numbers';
import type { Violation } from '@/domain/rules/violation';

/** RN-ENT-02 limits. RIR 5 means "5 or more". */
export const SET_LIMITS = {
  loadKg: { min: 0, max: 1000 },
  reps: { min: 0, max: 100 },
  rir: { min: 0, max: 5 },
} as const;

export type SetViolationCode =
  | 'set.laterality'
  | 'set.load.required'
  | 'set.load.notAllowed'
  | 'set.load.range'
  | 'set.reps'
  | 'set.rir';

/**
 * I-11, RN-SUG-01: a set counts if it isn't a warm-up and has at least 1 rep. A unilateral set
 * counts by its limiting side (RN-ENT-06).
 */
export function isEffectiveSet(set: WorkoutSet): boolean {
  if (set.isWarmup) return false;
  const reps = set.isUnilateral ? limitingSide(set).reps : set.reps;
  return reps >= 1;
}

/**
 * A valid set for its workout exercise. The laterality and the load type are the ones copied in
 * the workout exercise, not the catalog's, so a catalog change never invalidates history (I-05,
 * I-06, RN-ENT-08). Ranges from RN-ENT-02; the effort required in calibration (RN-SUG-06) is the
 * engine's.
 */
export function validateWorkoutSet(
  set: WorkoutSet,
  exercise: Pick<WorkoutExercise, 'loadType' | 'isUnilateral'>,
): Violation<SetViolationCode>[] {
  const violations: Violation<SetViolationCode>[] = [];
  const check = (ok: boolean, code: SetViolationCode, field: string) => {
    if (!ok) violations.push({ code, path: [field] });
  };

  check(set.isUnilateral === exercise.isUnilateral, 'set.laterality', 'isUnilateral');

  if (exercise.loadType === 'bodyweight') {
    check(set.loadKg === null, 'set.load.notAllowed', 'loadKg');
  } else if (set.loadKg === null) {
    check(false, 'set.load.required', 'loadKg');
  } else {
    const { min, max } = SET_LIMITS.loadKg;
    // `>=` and `<=` are false for NaN, so NaN is out of range too.
    check(set.loadKg >= min && set.loadKg <= max, 'set.load.range', 'loadKg');
  }

  const reps = (value: number, field: string) =>
    check(isWholeBetween(value, SET_LIMITS.reps.min, SET_LIMITS.reps.max), 'set.reps', field);
  const rir = (value: number | null, field: string) =>
    check(
      value === null || isWholeBetween(value, SET_LIMITS.rir.min, SET_LIMITS.rir.max),
      'set.rir',
      field,
    );

  if (set.isUnilateral) {
    reps(set.repsLeft, 'repsLeft');
    reps(set.repsRight, 'repsRight');
    rir(set.rirLeft, 'rirLeft');
    rir(set.rirRight, 'rirRight');
  } else {
    reps(set.reps, 'reps');
    rir(set.rir, 'rir');
  }
  return violations;
}
