import { useEffect, useState } from 'react';

import type { EffortMode, Id } from '@/domain/models/vocabulary';
import type { WorkoutSet } from '@/domain/models/workout';
import { sortByPosition } from '@/domain/rules/position-order';
import { prefill, type PrefilledSet } from '@/domain/rules/workout/prefill';
import { firstIncomplete, remainingSets } from '@/domain/rules/workout/remaining-sets';
import type { WorkoutExerciseView, WorkoutOverview } from '@/domain/usecases/observe-workout';
import {
  formErrors,
  formFromPrefill,
  formFromSet,
  toSetInput,
  type RirField,
  type SetForm,
  type SetFormErrors,
} from '@/presentation/features/workout/set-form';
import { useUseCases } from '@/presentation/use-cases/use-cases-context';

/** One row of the set list (08 §5): logged, the current one, or still to do. */
export type SetRowView =
  | {
      kind: 'done';
      number: number;
      set: WorkoutSet;
      /** RF-ENT-02.AC4: the effort options stay in the row until one is chosen or the next set. */
      askEffort: boolean;
    }
  | { kind: 'current' | 'pending'; number: number; values: PrefilledSet };

export interface WorkoutContent {
  status: 'content';
  dayName: string;
  startedAt: Date;
  effortMode: EffortMode;
  exerciseIndex: number;
  exercises: readonly WorkoutExerciseView[];
  exercise: WorkoutExerciseView;
  rows: SetRowView[];
  /** What the main button does: log the current set, or go to the next exercise. */
  primary: 'done' | 'nextExercise' | null;
}

export type WorkoutState =
  | { status: 'loading' }
  /** No workout in progress (finished or discarded elsewhere): back to the tabs. */
  | { status: 'none' }
  | { status: 'error' }
  | WorkoutContent;

export type WorkoutSheet =
  | { kind: 'adjust'; form: SetForm; errors: SetFormErrors | null }
  | { kind: 'edit'; set: WorkoutSet; number: number; form: SetForm; errors: SetFormErrors | null }
  | { kind: 'exercises' }
  | { kind: 'exerciseMenu' };

export interface WorkoutViewModel {
  state: WorkoutState;
  sheet: WorkoutSheet | null;
  /** «Serie eliminada · Deshacer» (RF-ENT-04.AC2). */
  deleted: WorkoutSet | null;
  actions: {
    /** «Hecho»: logs the current set; 'adjust' when it needs a value first (calibration). */
    done(): Promise<'logged' | 'adjust' | 'none'>;
    openAdjust(): void;
    editForm(change: (form: SetForm) => SetForm): void;
    /** «Hecho» in the sheet. */
    confirmAdjust(): Promise<'logged' | 'invalid'>;
    openSet(setId: Id): void;
    saveEdit(): Promise<void>;
    deleteSet(): Promise<void>;
    undo(): Promise<void>;
    dismissUndo(): void;
    chooseEffort(set: WorkoutSet, field: RirField, rir: number): Promise<void>;
    goTo(index: number): void;
    nextExercise(): void;
    openExercises(): void;
    openExerciseMenu(): void;
    addSet(): void;
    closeSheet(): void;
  };
}

/** The rows of an exercise: logged sets, then the current one and the rest still to do. */
function rowsOf(view: WorkoutExerciseView, extra: number, effortSetId: Id | null): SetRowView[] {
  const sets = sortByPosition(view.exercise.sets);
  const rows: SetRowView[] = sets.map((set, index) => ({
    kind: 'done',
    number: index + 1,
    set,
    askEffort: set.id === effortSetId && !hasEffort(set),
  }));
  const remaining = remainingSets(view.exercise, extra);
  const prescribedLeft = remainingSets(view.exercise);
  for (let i = 0; i < remaining; i++) {
    rows.push({
      kind: i === 0 ? 'current' : 'pending',
      number: sets.length + i + 1,
      // RF-ENT-05: an extra set starts with the values of the last one.
      values:
        i >= prescribedLeft && sets.length > 0
          ? valuesOf(sets.at(-1)!)
          : prefill(view.suggestion, sets),
    });
  }
  return rows;
}

function valuesOf(set: WorkoutSet): PrefilledSet {
  return {
    loadKg: set.loadKg,
    reps: set.isUnilateral ? Math.min(set.repsLeft, set.repsRight) : set.reps,
  };
}

function hasEffort(set: WorkoutSet): boolean {
  return set.isUnilateral ? set.rirLeft !== null && set.rirRight !== null : set.rir !== null;
}

/**
 * S09 · Entrenamiento en curso (RF-ENT-02..05, RF-ENT-14, RF-SUG-01.AC2). Every write goes to the
 * local database and the screen follows it (RN-SYNC-01): nothing waits for the network.
 */
export function useWorkoutViewModel(): WorkoutViewModel {
  const { observeWorkout, logSet, updateSet, deleteSet, restoreSet } = useUseCases();
  const [overview, setOverview] = useState<WorkoutOverview | null | 'loading' | 'error'>('loading');
  const [chosenIndex, setChosenIndex] = useState<number | null>(null);
  const [extras, setExtras] = useState<Record<Id, number>>({});
  const [effortSetId, setEffortSetId] = useState<Id | null>(null);
  const [sheet, setSheet] = useState<WorkoutSheet | null>(null);
  const [deleted, setDeleted] = useState<WorkoutSet | null>(null);

  useEffect(
    () => observeWorkout.execute({ next: setOverview, error: () => setOverview('error') }),
    [observeWorkout],
  );

  const state = contentOf(overview, chosenIndex, extras, effortSetId);
  const content = state.status === 'content' ? state : null;
  const current = content?.rows.find((row) => row.kind === 'current') ?? null;
  const extraOf = (id: Id) => extras[id] ?? 0;

  /** Logs the current set and, after its last prescribed set, moves on (RF-ENT-02.AC7). */
  async function log(form: SetForm): Promise<'logged' | 'invalid'> {
    if (!content) return 'invalid';
    const { exercise } = content.exercise;
    const errors = formErrors(form, exercise);
    if (errors.load || errors.reps) return 'invalid';
    const input = toSetInput(form, exercise);
    const result = await logSet.execute(exercise.id, input);
    if (result.status !== 'saved') return 'invalid';
    setEffortSetId(result.set.id);
    if (!input.isWarmup && remainingSets(exercise, extraOf(exercise.id)) === 1) {
      const next = firstIncomplete(
        content.exercises.map((e) => e.exercise),
        content.exerciseIndex,
        (e) => extraOf(e.id),
      );
      if (next !== null) setChosenIndex(next);
    }
    return 'logged';
  }

  return {
    state,
    sheet,
    deleted,
    actions: {
      async done() {
        if (!content || current?.kind !== 'current') return 'none';
        const form = formFromPrefill(current.values);
        if ((await log(form)) === 'logged') return 'logged';
        setSheet({ kind: 'adjust', form, errors: formErrors(form, content.exercise.exercise) });
        return 'adjust';
      },
      openAdjust() {
        if (current?.kind === 'current') {
          setSheet({ kind: 'adjust', form: formFromPrefill(current.values), errors: null });
        }
      },
      editForm(change) {
        setSheet((open) =>
          open?.kind === 'adjust' || open?.kind === 'edit'
            ? { ...open, form: change(open.form), errors: null }
            : open,
        );
      },
      async confirmAdjust() {
        if (sheet?.kind !== 'adjust' || !content) return 'invalid';
        const result = await log(sheet.form);
        if (result === 'logged') setSheet(null);
        else setSheet({ ...sheet, errors: formErrors(sheet.form, content.exercise.exercise) });
        return result;
      },
      openSet(setId) {
        const row = content?.rows.find((r) => r.kind === 'done' && r.set.id === setId);
        if (row?.kind !== 'done') return;
        setSheet({
          kind: 'edit',
          set: row.set,
          number: row.number,
          form: formFromSet(row.set),
          errors: null,
        });
      },
      async saveEdit() {
        if (sheet?.kind !== 'edit' || !content) return;
        const errors = formErrors(sheet.form, content.exercise.exercise);
        if (errors.load || errors.reps) return setSheet({ ...sheet, errors });
        await updateSet.execute(sheet.set.id, toSetInput(sheet.form, content.exercise.exercise));
        setSheet(null);
      },
      async deleteSet() {
        if (sheet?.kind !== 'edit') return;
        setSheet(null);
        setDeleted(await deleteSet.execute(sheet.set.id));
      },
      async undo() {
        if (deleted === null) return;
        setDeleted(null);
        await restoreSet.execute(deleted);
      },
      dismissUndo: () => setDeleted(null),
      async chooseEffort(set, field, rir) {
        const exercise = content?.exercises.find((e) => e.exercise.id === set.workoutExerciseId);
        if (!exercise) return;
        const form = { ...formFromSet(set), [field]: rir };
        const both = field === 'rir' ? { rirLeft: rir, rirRight: rir } : {};
        await updateSet.execute(set.id, toSetInput({ ...form, ...both }, exercise.exercise));
      },
      goTo(index) {
        setChosenIndex(index);
        setSheet(null);
      },
      nextExercise() {
        if (!content) return;
        const next = firstIncomplete(
          content.exercises.map((e) => e.exercise),
          content.exerciseIndex,
          (e) => extraOf(e.id),
        );
        setChosenIndex(next ?? (content.exerciseIndex + 1) % content.exercises.length);
      },
      openExercises: () => setSheet({ kind: 'exercises' }),
      openExerciseMenu: () => setSheet({ kind: 'exerciseMenu' }),
      addSet() {
        if (!content) return;
        const id = content.exercise.exercise.id;
        setExtras((all) => ({ ...all, [id]: (all[id] ?? 0) + 1 }));
        setSheet(null);
      },
      closeSheet: () => setSheet(null),
    },
  };
}

function contentOf(
  overview: WorkoutOverview | null | 'loading' | 'error',
  chosenIndex: number | null,
  extras: Record<Id, number>,
  effortSetId: Id | null,
): WorkoutState {
  if (overview === 'loading') return { status: 'loading' };
  if (overview === 'error') return { status: 'error' };
  if (overview === null || overview.exercises.length === 0) return { status: 'none' };
  const { exercises } = overview;
  const extraOf = (id: Id) => extras[id] ?? 0;
  // Until the user picks one, the first exercise with sets left (RF-ENT-13 resumes there too).
  const firstOpen = exercises.findIndex(
    (e) => remainingSets(e.exercise, extraOf(e.exercise.id)) > 0,
  );
  const exerciseIndex = Math.min(chosenIndex ?? Math.max(firstOpen, 0), exercises.length - 1);
  const exercise = exercises[exerciseIndex];
  const rows = rowsOf(exercise, extraOf(exercise.exercise.id), effortSetId);
  const anyLeft = exercises.some((e) => remainingSets(e.exercise, extraOf(e.exercise.id)) > 0);
  return {
    status: 'content',
    dayName: overview.workout.dayNameSnapshot,
    startedAt: overview.workout.startedAt,
    effortMode: overview.effortMode,
    exerciseIndex,
    exercises,
    exercise,
    rows,
    primary: rows.some((r) => r.kind === 'current') ? 'done' : anyLeft ? 'nextExercise' : null,
  };
}
