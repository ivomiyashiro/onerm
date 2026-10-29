import type { RestMessage } from '@/domain/models/rest-timer';
import type { EffortMode, ExperienceLevel, Id, LoadUnit } from '@/domain/models/vocabulary';
import type { WorkoutSet } from '@/domain/models/workout';
import { sortByPosition } from '@/domain/rules/position-order';
import { toUnit } from '@/domain/rules/units';
import { prefill, type PrefilledSet } from '@/domain/rules/workout/prefill';
import { firstIncomplete, remainingSets } from '@/domain/rules/workout/remaining-sets';
import type { WorkoutExerciseView } from '@/domain/usecases/observe-workout';
import { reasonLine } from '@/presentation/features/workout/reason-text';
import { catalog } from '@/presentation/strings/catalog';
import { common } from '@/presentation/strings/common';
import { loadNumber } from '@/presentation/strings/numbers';
import { workout as text } from '@/presentation/strings/workout';

/** What comes after the rest (08 §5 «Siguiente: …»). */
type RestNext =
  | { kind: 'set'; number: number; total: number; values: string }
  | { kind: 'exercise'; name: string; values: string }
  /** RF-SUG-02.AC4: the next load depends on the effort still to answer. */
  | { kind: 'calibrating'; number: number; total: number }
  | { kind: 'none' };

/** S09 descanso (Figma «Descanso», marca §13): the rest running after a set. */
export interface RestView {
  endsAt: Date;
  /** The prescribed rest of the exercise: «de 2:00» and the ring. */
  totalSeconds: number;
  exerciseName: string;
  /** The set just done, with its effort options (RF-ENT-02.AC4). */
  set: WorkoutSet;
  setNumber: number;
  /** «Serie 1 · 62,5 kg × 8». */
  setText: string;
  /** A calibration set without its effort: its card is highlighted (RF-SUG-02.AC4). */
  awaitingEffort: boolean;
  /** After answering a calibration set: the reason of the new load (13 §4). */
  calibrationNote: string | null;
  /** «Siguiente: …» of the full screen and the finished card. */
  nextText: string;
  /** «Siguiente: 62,5 kg × 8» of the minimized bar. */
  nextShort: string;
  /** What the notification says when the rest ends (RN-ENT-07). */
  message: RestMessage;
}

interface RestInputs {
  exercises: readonly WorkoutExerciseView[];
  level: ExperienceLevel;
  effortMode: EffortMode;
  extraOf: (workoutExerciseId: Id) => number;
}

const CALIBRATION_CODES = new Set(['CALIBRATION', 'CALIBRATION_STEP', 'CALIBRATION_STEP_DOWN']);

/** «62,5 kg × 8», or «× 8» without a load. */
export function valuesText(values: PrefilledSet, unit: LoadUnit | null): string {
  // Bodyweight has no load: its reps, as in S12. With equipment, no load is a first time.
  if (unit === null) return text.set.timesReps(values.reps);
  if (values.loadKg === null) return text.rest.firstTime;
  const load = `${loadNumber(toUnit(values.loadKg, unit), unit)} ${common.units[unit]}`;
  return `${load} ${text.set.timesReps(values.reps)}`;
}

function setValues(set: WorkoutSet): PrefilledSet {
  return {
    loadKg: set.loadKg,
    reps: set.isUnilateral ? Math.min(set.repsLeft, set.repsRight) : set.reps,
  };
}

const nextValues = (view: WorkoutExerciseView) =>
  prefill(view.suggestion, view.exercise.sets, view.recalculated);

/**
 * RF-ENT-06: the rest belongs to the last effective set logged in the workout, wherever the user
 * moved since. Null with no rest running.
 */
export function restViewOf(endsAt: Date | null, inputs: RestInputs): RestView | null {
  if (endsAt === null) return null;
  const { exercises, extraOf } = inputs;
  const done = exercises.flatMap((view, index) =>
    sortByPosition(view.exercise.sets)
      .filter((set) => !set.isWarmup)
      .map((set) => ({ set, view, index })),
  );
  // The latest one; on a tie, the later in the list.
  const last = done.reduce<(typeof done)[number] | undefined>(
    (best, entry) =>
      best === undefined || entry.set.completedAt >= best.set.completedAt ? entry : best,
    undefined,
  );
  if (last === undefined) return null;
  const { set, view, index } = last;
  const unit = view.grid?.unit ?? null;
  const name = view.name ?? catalog.detail.unavailable;
  const sets = sortByPosition(view.exercise.sets);
  const setNumber = sets.findIndex((s) => s.id === set.id) + 1;
  const awaitingEffort = view.awaitingEffort?.id === set.id;
  const isLastSet = sets.filter((s) => !s.isWarmup).at(-1)?.id === set.id;

  let next: RestNext;
  const left = remainingSets(view.exercise, extraOf(view.exercise.id));
  if (left > 0) {
    const number = sets.length + 1;
    const total = Math.max(view.exercise.prescription.sets, number);
    next = awaitingEffort
      ? { kind: 'calibrating', number, total }
      : { kind: 'set', number, total, values: valuesText(nextValues(view), unit) };
  } else {
    const following = firstIncomplete(
      exercises.map((e) => e.exercise),
      index,
      (e) => extraOf(e.id),
    );
    const other = following === null ? null : exercises[following];
    next =
      other === null
        ? { kind: 'none' }
        : {
            kind: 'exercise',
            name: other.name ?? catalog.detail.unavailable,
            values: valuesText(nextValues(other), other.grid?.unit ?? null),
          };
  }

  const nextText =
    next.kind === 'set'
      ? text.rest.nextSet(next.number, next.total, next.values)
      : next.kind === 'exercise'
        ? text.rest.next(next.name, next.values)
        : next.kind === 'calibrating'
          ? text.calibration.nextByAnswer(next.number, next.total)
          : text.rest.lastExerciseDone;

  return {
    endsAt,
    totalSeconds: view.exercise.prescription.restSeconds,
    exerciseName: name,
    set,
    setNumber,
    setText: text.rest.doneSet(setNumber, valuesText(setValues(set), unit)),
    awaitingEffort,
    calibrationNote:
      !awaitingEffort &&
      isLastSet &&
      view.recalculated &&
      CALIBRATION_CODES.has(view.suggestion.reason.code)
        ? reasonLine({
            explanation: view.explanation,
            level: inputs.level,
            effortMode: inputs.effortMode,
            unit: unit ?? 'kg',
            basisName: view.basisName,
          })
        : null,
    nextText,
    nextShort:
      next.kind === 'set' || next.kind === 'exercise' ? text.rest.nextShort(next.values) : nextText,
    message: {
      title: text.restNotification.title,
      body:
        next.kind === 'set'
          ? text.rest.next(name, next.values)
          : next.kind === 'exercise'
            ? text.rest.next(next.name, next.values)
            : nextText,
    },
  };
}
