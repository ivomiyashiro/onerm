import { useEffect, useState } from 'react';

import type { Id } from '@/domain/models/vocabulary';
import type { WorkoutSet } from '@/domain/models/workout';
import type { DetailExercise, WorkoutDetail } from '@/domain/usecases/observe-workout-detail';
import {
  formErrors,
  formFromPrefill,
  formFromSet,
  toSetInput,
  type SetForm,
  type SetFormErrors,
} from '@/presentation/features/workout/set-form';
import { useUseCases } from '@/presentation/use-cases/use-cases-context';

export type WorkoutDetailState =
  | { status: 'loading' }
  | { status: 'content'; detail: WorkoutDetail }
  /** Deleted (here or elsewhere): back to S18. */
  | { status: 'missing' }
  | { status: 'error' };

/** «Editar serie n» of a logged set, or a forgotten one being added (RF-PROG-03.AC1, AC3). */
export type DetailSheet =
  | {
      kind: 'edit';
      exercise: DetailExercise;
      set: WorkoutSet;
      number: number;
      form: SetForm;
      errors: SetFormErrors | null;
    }
  | {
      kind: 'adjust';
      exercise: DetailExercise;
      number: number;
      form: SetForm;
      errors: SetFormErrors | null;
    }
  | { kind: 'menu' };

/** D16, for a set or for the whole workout (RF-PROG-03.AC2, AC4). */
export type DetailConfirm =
  { target: 'set'; set: WorkoutSet } | { target: 'workout'; sets: number };

export interface WorkoutDetailViewModel {
  state: WorkoutDetailState;
  /** «Editar entrenamiento»: the sets open, «Agregar serie» and the menu show. */
  editing: boolean;
  sheet: DetailSheet | null;
  confirm: DetailConfirm | null;
  actions: {
    startEditing(): void;
    finishEditing(): void;
    openSet(exerciseId: Id, setId: Id): void;
    addSet(exerciseId: Id): void;
    editForm(change: (form: SetForm) => SetForm): void;
    save(): Promise<void>;
    askDeleteSet(): void;
    openMenu(): void;
    askDeleteWorkout(): void;
    confirmDelete(): Promise<void>;
    closeSheet(): void;
    closeConfirm(): void;
  };
}

/** S19 · Detalle de entrenamiento (RF-PROG-02, RF-PROG-03): reading, then editing the past. */
export function useWorkoutDetailViewModel(workoutId: Id): WorkoutDetailViewModel {
  const { observeWorkoutDetail, updatePastSet, addPastSet, deletePastSet, deleteWorkout } =
    useUseCases();
  const [state, setState] = useState<WorkoutDetailState>({ status: 'loading' });
  const [editing, setEditing] = useState(false);
  const [sheet, setSheet] = useState<DetailSheet | null>(null);
  const [confirm, setConfirm] = useState<DetailConfirm | null>(null);

  useEffect(
    () =>
      observeWorkoutDetail.execute(workoutId, {
        next: (detail) =>
          setState(detail === null ? { status: 'missing' } : { status: 'content', detail }),
        error: () => setState({ status: 'error' }),
      }),
    [observeWorkoutDetail, workoutId],
  );

  const detail = state.status === 'content' ? state.detail : null;
  const exerciseOf = (id: Id) => detail?.exercises.find((e) => e.exercise.id === id);

  return {
    state,
    editing,
    sheet,
    confirm,
    actions: {
      startEditing: () => setEditing(true),
      finishEditing() {
        setEditing(false);
        setSheet(null);
      },
      openSet(exerciseId, setId) {
        const exercise = exerciseOf(exerciseId);
        const index = exercise?.exercise.sets.findIndex((s) => s.id === setId) ?? -1;
        if (!editing || !exercise || index < 0) return;
        const set = exercise.exercise.sets[index];
        setSheet({
          kind: 'edit',
          exercise,
          set,
          number: index + 1,
          form: formFromSet(set),
          errors: null,
        });
      },
      addSet(exerciseId) {
        const exercise = exerciseOf(exerciseId);
        if (!exercise) return;
        const last = exercise.exercise.sets.at(-1);
        // The values of the last set, or empty for a skipped exercise.
        const form = last
          ? { ...formFromSet(last), isWarmup: false }
          : formFromPrefill({ loadKg: null, reps: exercise.exercise.prescription.repRange.min });
        setSheet({
          kind: 'adjust',
          exercise,
          number: exercise.exercise.sets.length + 1,
          form,
          errors: null,
        });
      },
      editForm(change) {
        setSheet((open) =>
          open?.kind === 'edit' || open?.kind === 'adjust'
            ? { ...open, form: change(open.form), errors: null }
            : open,
        );
      },
      async save() {
        if (sheet?.kind !== 'edit' && sheet?.kind !== 'adjust') return;
        const copy = sheet.exercise.exercise;
        const errors = formErrors(sheet.form, copy);
        if (errors.load || errors.reps) return setSheet({ ...sheet, errors });
        const input = toSetInput(sheet.form, copy);
        const result =
          sheet.kind === 'edit'
            ? await updatePastSet.execute(workoutId, sheet.set.id, input)
            : await addPastSet.execute(workoutId, copy.id, input);
        // RF-PROG-03.AC6: a value out of RN-ENT-02 is shown, not saved.
        if (result.status === 'invalid')
          return setSheet({ ...sheet, errors: formErrors(sheet.form, copy) });
        setSheet(null);
      },
      askDeleteSet() {
        if (sheet?.kind !== 'edit') return;
        setSheet(null);
        setConfirm({ target: 'set', set: sheet.set });
      },
      openMenu: () => setSheet({ kind: 'menu' }),
      askDeleteWorkout() {
        if (!detail) return;
        setSheet(null);
        const sets = detail.exercises.reduce((n, e) => n + e.exercise.sets.length, 0);
        setConfirm({ target: 'workout', sets });
      },
      async confirmDelete() {
        const target = confirm;
        setConfirm(null);
        if (target?.target === 'set') await deletePastSet.execute(workoutId, target.set.id);
        if (target?.target === 'workout') await deleteWorkout.execute(workoutId);
      },
      closeSheet: () => setSheet(null),
      closeConfirm: () => setConfirm(null),
    },
  };
}
