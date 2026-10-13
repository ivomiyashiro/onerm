import type { EffortMode, LoadType } from '@/domain/models/vocabulary';
import type { WorkoutSet } from '@/domain/models/workout';
import type { LoadGrid } from '@/domain/rules/suggestion/load-grid';
import { fromUnit, toUnit } from '@/domain/rules/units';
import type { PrefilledSet } from '@/domain/rules/workout/prefill';
import { validateWorkoutSet } from '@/domain/rules/workout-set-rules';
import type { SetInput } from '@/domain/usecases/workout-sets';
import { parseDecimal } from '@/presentation/strings/numbers';

/** What the «Ajustar serie» and «Editar serie» sheets edit. Loads in kg, like the domain. */
export interface SetForm {
  /** Null while there is no load: bodyweight, or the first set of a calibration ("—"). */
  readonly loadKg: number | null;
  /** What is being typed in the load step, until a ± replaces it (RF-ENT-02.AC3). */
  readonly loadText: string | null;
  readonly reps: number;
  /** «Distinto por lado» (RF-ENT-03.AC2): each side has its own reps and effort. */
  readonly split: boolean;
  readonly repsLeft: number;
  readonly repsRight: number;
  readonly isWarmup: boolean;
  readonly rir: number | null;
  readonly rirLeft: number | null;
  readonly rirRight: number | null;
}

export type RepsField = 'reps' | 'repsLeft' | 'repsRight';
export type RirField = 'rir' | 'rirLeft' | 'rirRight';

/** Which steps show an error (RF-ENT-02.AC5); the message goes in the step (marca §12). */
export interface SetFormErrors {
  readonly load: boolean;
  readonly reps: boolean;
}

export function formFromPrefill({ loadKg, reps }: PrefilledSet): SetForm {
  return {
    loadKg,
    loadText: null,
    reps,
    split: false,
    repsLeft: reps,
    repsRight: reps,
    isWarmup: false,
    rir: null,
    rirLeft: null,
    rirRight: null,
  };
}

/** «Editar serie» (RF-ENT-04.AC1): the form of a logged set. */
export function formFromSet(set: WorkoutSet): SetForm {
  if (!set.isUnilateral) {
    return { ...formFromPrefill(set), isWarmup: set.isWarmup, rir: set.rir };
  }
  const split = set.repsLeft !== set.repsRight || set.rirLeft !== set.rirRight;
  return {
    ...formFromPrefill({ loadKg: set.loadKg, reps: set.repsLeft }),
    split,
    repsLeft: set.repsLeft,
    repsRight: set.repsRight,
    isWarmup: set.isWarmup,
    rir: set.rirLeft,
    rirLeft: set.rirLeft,
    rirRight: set.rirRight,
  };
}

/**
 * ± one increment of the equipment, in the user unit (RN-PERF-06). Without a load, the first +
 * puts one increment (RN-ENT-04, calibration) and − leaves it empty. Never below 0.
 */
export function stepLoad(form: SetForm, grid: LoadGrid, direction: 1 | -1): SetForm {
  const current =
    form.loadKg === null || Number.isNaN(form.loadKg) ? null : toUnit(form.loadKg, grid.unit);
  if (current === null) {
    return direction === 1
      ? { ...form, loadText: null, loadKg: fromUnit(grid.increment, grid.unit) }
      : { ...form, loadText: null };
  }
  const next = Math.max(0, current + direction * grid.increment);
  return { ...form, loadText: null, loadKg: fromUnit(next, grid.unit) };
}

/** The load typed with the keyboard (RF-ENT-02.AC3): anything but a number is out of range. */
export function typeLoad(form: SetForm, text: string, grid: LoadGrid): SetForm {
  const value = parseDecimal(text);
  return { ...form, loadText: text, loadKg: value === null ? NaN : fromUnit(value, grid.unit) };
}

export function stepReps(form: SetForm, field: RepsField, direction: 1 | -1): SetForm {
  const next = Math.max(0, form[field] + direction);
  // Both sides follow the shared reps until they are split (RF-ENT-03.AC1).
  return field === 'reps'
    ? { ...form, reps: next, repsLeft: next, repsRight: next }
    : {
        ...form,
        [field]: next,
      };
}

export function setRir(form: SetForm, field: RirField, rir: number): SetForm {
  return field === 'rir'
    ? { ...form, rir, rirLeft: rir, rirRight: rir }
    : { ...form, [field]: rir };
}

/** What the use cases take. Bodyweight never has a load (I-06). */
export function toSetInput(
  form: SetForm,
  exercise: { loadType: LoadType; isUnilateral: boolean },
): SetInput {
  const loadKg = exercise.loadType === 'bodyweight' ? null : form.loadKg;
  if (!exercise.isUnilateral) {
    return { isUnilateral: false, loadKg, reps: form.reps, rir: form.rir, isWarmup: form.isWarmup };
  }
  return {
    isUnilateral: true,
    loadKg,
    repsLeft: form.split ? form.repsLeft : form.reps,
    repsRight: form.split ? form.repsRight : form.reps,
    rirLeft: form.split ? form.rirLeft : form.rir,
    rirRight: form.split ? form.rirRight : form.rir,
    isWarmup: form.isWarmup,
  };
}

/** RN-ENT-02, with the domain's own rule: the sheet only says which step is wrong. */
export function formErrors(
  form: SetForm,
  exercise: { loadType: LoadType; isUnilateral: boolean },
): SetFormErrors {
  const input = toSetInput(form, exercise);
  const codes = validateWorkoutSet(
    {
      ...input,
      id: '',
      workoutExerciseId: '',
      position: 0,
      completedAt: new Date(0),
    } as WorkoutSet,
    exercise,
  ).map((v) => v.code);
  return {
    load: codes.some((code) => code.startsWith('set.load')),
    reps: codes.includes('set.reps'),
  };
}

/** RN-ENT-03: the simple scale and what each answer stores; the RIR mode stores 0–5. */
export const EFFORT_VALUES: Record<EffortMode, readonly number[]> = {
  simple: [0, 1, 2, 4],
  rir: [0, 1, 2, 3, 4, 5],
};
