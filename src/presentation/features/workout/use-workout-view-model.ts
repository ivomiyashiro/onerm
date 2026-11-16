import { useEffect, useState } from 'react';

import type { Exercise } from '@/domain/models/exercise';
import type { Id } from '@/domain/models/vocabulary';
import type { WorkoutSet } from '@/domain/models/workout';
import { isEffectiveSet } from '@/domain/rules/workout/workout-set-rules';
import { firstIncomplete, remainingSets } from '@/domain/rules/workout/remaining-sets';
import {
  substituteOptions,
  type SubstituteOptions,
} from '@/domain/rules/workout/substitute-options';
import type { WorkoutOverview } from '@/domain/usecases/workout/observe-workout';
import { whyDetail, type WhyDetail } from '@/presentation/shared/reason-text';
import {
  formErrors,
  formFromPrefill,
  formFromSet,
  toSetInput,
  type RirField,
  type SetForm,
  type SetFormErrors,
} from '@/presentation/shared/set/set-form';
import { useRest, type Rest } from '@/presentation/features/workout/use-rest';
import {
  contentOf,
  reasonInputOf,
  type WorkoutContent,
  type WorkoutState,
} from '@/presentation/features/workout/workout-content';
import type { SetRowView } from '@/presentation/shared/set/set-row';
import {
  useExercisesUseCases,
  useWorkoutUseCases,
} from '@/presentation/use-cases/use-cases-context';

export type { SetRowView, WorkoutContent, WorkoutState };

export type WorkoutSheet =
  | { kind: 'adjust'; form: SetForm; errors: SetFormErrors | null }
  | { kind: 'edit'; set: WorkoutSet; number: number; form: SetForm; errors: SetFormErrors | null }
  | { kind: 'exercises' }
  /** S10 «¿Por qué?» (RF-SUG-07.AC2). */
  | { kind: 'why'; detail: WhyDetail }
  /** S26 «Cómo se hace» of the current exercise (RF-CAT-02 AC7). */
  | { kind: 'howTo' }
  | { kind: 'workoutMenu' }
  /** S11 · Sustituir ejercicio (RF-ENT-09.AC1). */
  | { kind: 'substitute'; query: string; options: SubstituteOptions };

/**
 * D10 before finishing with exercises without sets (RF-ENT-11.AC2), D09 before discarding, and
 * D18 when there is nothing to finish: no effective set at all (AC5).
 */
export type WorkoutConfirm =
  { kind: 'finish'; pending: number } | { kind: 'discard'; sets: number } | { kind: 'empty' };

export interface WorkoutViewModel extends Pick<
  Rest,
  'rest' | 'restMinimized' | 'dialog' | 'notice'
> {
  state: WorkoutState;
  sheet: WorkoutSheet | null;
  /** «Serie eliminada · Deshacer» (RF-ENT-04.AC2). */
  deleted: WorkoutSet | null;
  confirm: WorkoutConfirm | null;
  actions: {
    /** «Hecho»: logs the current set; 'adjust' when it needs a value first (calibration). */
    done(): Promise<'logged' | 'adjust' | 'none'>;
    openAdjust(): void;
    openWhy(): void;
    openHowTo(): void;
    editForm(change: (form: SetForm) => SetForm): void;
    /** «Hecho» in the sheet. */
    confirmAdjust(): Promise<'logged' | 'invalid'>;
    openSet(setId: Id): void;
    saveEdit(): Promise<void>;
    /** From its sheet or swiping its row (#198); «Deshacer» brings it back. */
    deleteSet(setId: Id): Promise<void>;
    undo(): Promise<void>;
    dismissUndo(): void;
    chooseEffort(set: WorkoutSet, field: RirField, rir: number): Promise<void>;
    goTo(index: number): void;
    nextExercise(): void;
    openExercises(): void;
    /** RF-ENT-05: one more set, preloaded with the values of the last one. */
    addSet(): void;
    /** RF-ENT-05.AC2: takes back one set added to the current exercise and not logged. */
    removeSet(): void;
    closeSheet(): void;
    openWorkoutMenu(): void;
    openSubstitute(): void;
    searchSubstitute(query: string): void;
    substitute(exercise: Exercise): Promise<void>;
    /** RF-ENT-11: the finished workout's id, or null when D10 asks first. */
    finish(): Promise<Id | null>;
    confirmFinish(): Promise<Id | null>;
    /** RF-ENT-12: D09 first. */
    discard(): void;
    confirmDiscard(): Promise<void>;
    closeConfirm(): void;
  } & Rest['actions'];
}

/**
 * S09 · Entrenamiento en curso (RF-ENT-02..05, RF-ENT-14, RF-SUG-01.AC2). Every write goes to the
 * local database and the screen follows it (RN-SYNC-01): nothing waits for the network.
 */
export function useWorkoutViewModel(): WorkoutViewModel {
  const {
    observeWorkout,
    logSet,
    updateSet,
    deleteSet,
    restoreSet,
    substituteExercise,
    finishWorkout,
    discardWorkout,
  } = useWorkoutUseCases();
  const { observeExercises } = useExercisesUseCases();
  const [overview, setOverview] = useState<WorkoutOverview | null | 'loading' | 'error'>('loading');
  const [chosenIndex, setChosenIndex] = useState<number | null>(null);
  // RF-ENT-08.AC1 (D1): the exercises the user moved on from without sets. «Hecho» doesn't go
  // back to them and they don't hold «Finalizar»; D10 still lists them. Only in memory: after a
  // restart the workout resumes on the first pending one (RF-ENT-13).
  const [passedOver, setPassedOver] = useState<ReadonlySet<Id>>(NO_IDS);
  const [extras, setExtras] = useState<Record<Id, number>>({});
  const [effortSetId, setEffortSetId] = useState<Id | null>(null);
  const [sheet, setSheet] = useState<WorkoutSheet | null>(null);
  const [deleted, setDeleted] = useState<WorkoutSet | null>(null);
  const [confirm, setConfirm] = useState<WorkoutConfirm | null>(null);
  const [catalog, setCatalog] = useState<Exercise[]>([]);

  useEffect(
    () => observeWorkout.execute({ next: setOverview, error: () => setOverview('error') }),
    [observeWorkout],
  );

  // S11 reads the catalog only while it is open.
  const substituting = sheet?.kind === 'substitute';
  useEffect(() => {
    if (!substituting) return;
    return observeExercises.execute({ next: setCatalog, error: () => setCatalog([]) });
  }, [substituting, observeExercises]);

  const state = contentOf(overview, chosenIndex, extras, effortSetId, passedOver);
  const content = state.status === 'content' ? state : null;
  const current = content?.rows.find((row) => row.kind === 'current') ?? null;
  const extraOf = (id: Id) => extras[id] ?? 0;
  const rest = useRest(typeof overview === 'object' ? overview : null, extraOf);

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
    await rest.onLogged({
      isWarmup: input.isWarmup,
      restSeconds: exercise.prescription.restSeconds,
    });
    if (!input.isWarmup && remainingSets(exercise, extraOf(exercise.id)) === 1) {
      const next = firstIncomplete(
        content.exercises.map((e) => e.exercise),
        content.exerciseIndex,
        (e) => extraOf(e.id),
        passedOver,
      );
      if (next !== null) setChosenIndex(next);
    }
    return 'logged';
  }

  const shownSheet: WorkoutSheet | null =
    sheet?.kind === 'substitute' && content
      ? {
          ...sheet,
          options: substituteOptions(catalog, content.exercise.exercise.exerciseId, sheet.query),
        }
      : sheet;

  /**
   * #241: a finished workout leaves its dialog or sheet open; S12 replaces the screen with them.
   * Closing an overlay in the same moment as the navigation made Android (Fabric) insert a view
   * that still had a parent. They only close when it couldn't finish.
   */
  async function finishNow(): Promise<Id | null> {
    const id = await finishWorkout.execute();
    if (id === null) {
      setConfirm(null);
      setSheet(null);
    }
    return id;
  }

  return {
    state,
    sheet: shownSheet,
    deleted,
    confirm,
    rest: rest.rest,
    restMinimized: rest.restMinimized,
    dialog: rest.dialog,
    notice: rest.notice,
    actions: {
      ...rest.actions,
      async done() {
        if (!content || content.primary !== 'done' || current?.kind !== 'current') return 'none';
        const form = formFromPrefill(current.values);
        if ((await log(form)) === 'logged') return 'logged';
        // Without a load yet (RN-ENT-04) the sheet asks for it: no error until it is confirmed.
        const errors = form.loadKg === null ? null : formErrors(form, content.exercise.exercise);
        setSheet({ kind: 'adjust', form, errors });
        return 'adjust';
      },
      openAdjust() {
        if (current?.kind === 'current') {
          setSheet({ kind: 'adjust', form: formFromPrefill(current.values), errors: null });
        }
      },
      openWhy() {
        if (content) {
          setSheet({ kind: 'why', detail: whyDetail(reasonInputOf(content, content.exercise)) });
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
        const errors = formErrors(sheet.form, content.exercise.exercise);
        if (errors.load || errors.reps) {
          setSheet({ ...sheet, errors });
          return 'invalid';
        }
        // Closed before the rest opens: on iOS a Modal shown over one that is closing is dropped
        // and leaves the screen without touches (#188).
        setSheet(null);
        const result = await log(sheet.form).catch(() => 'invalid' as const);
        // Not saved: the sheet comes back with what was typed.
        if (result === 'invalid') setSheet({ ...sheet, errors });
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
      async deleteSet(setId) {
        setSheet(null);
        setDeleted(await deleteSet.execute(setId));
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
        if (content && index !== content.exerciseIndex) {
          const left = content.exercise.exercise;
          const target = content.exercises[index]?.exercise.id;
          setPassedOver((ids) => {
            const next = new Set(ids);
            if (left.sets.length === 0) next.add(left.id);
            if (target !== undefined) next.delete(target);
            // The same set when nothing changed, so nothing re-renders for it (#221).
            return next.size === ids.size && [...next].every((id) => ids.has(id)) ? ids : next;
          });
        }
        setChosenIndex(index);
        setSheet(null);
      },
      nextExercise() {
        if (!content) return;
        const next = firstIncomplete(
          content.exercises.map((e) => e.exercise),
          content.exerciseIndex,
          (e) => extraOf(e.id),
          passedOver,
        );
        setChosenIndex(next ?? (content.exerciseIndex + 1) % content.exercises.length);
      },
      openExercises: () => setSheet({ kind: 'exercises' }),
      addSet() {
        if (!content) return;
        const id = content.exercise.exercise.id;
        setExtras((all) => ({ ...all, [id]: (all[id] ?? 0) + 1 }));
      },
      // The added sets are alike (all with the values of the last one): which one goes is the same.
      removeSet() {
        if (!content) return;
        const id = content.exercise.exercise.id;
        setExtras((all) => ({ ...all, [id]: Math.max(0, (all[id] ?? 0) - 1) }));
      },
      closeSheet: () => setSheet(null),
      openHowTo: () => setSheet({ kind: 'howTo' }),
      openWorkoutMenu: () => setSheet({ kind: 'workoutMenu' }),
      openSubstitute: () =>
        setSheet({ kind: 'substitute', query: '', options: { sameMuscle: [], others: [] } }),
      searchSubstitute: (query) =>
        setSheet((open) => (open?.kind === 'substitute' ? { ...open, query } : open)),
      async substitute(exercise) {
        if (!content) return;
        setSheet(null);
        const original = content.exercise.exercise;
        if ((await substituteExercise.execute(original.id, exercise)) === null) return;
        // RN-ENT-10: right after an original with sets, in its place otherwise.
        setChosenIndex(content.exerciseIndex + (original.sets.length > 0 ? 1 : 0));
      },
      async finish() {
        if (!content) return null;
        // AC5: without effective sets it would only move the next day and leave an empty workout.
        if (!content.exercises.some((e) => e.exercise.sets.some(isEffectiveSet))) {
          setSheet(null);
          setConfirm({ kind: 'empty' });
          return null;
        }
        const pending = content.exercises.filter((e) => e.exercise.status === 'pending').length;
        if (pending > 0) {
          setSheet(null);
          setConfirm({ kind: 'finish', pending });
          return null;
        }
        return finishNow();
      },
      confirmFinish: finishNow,
      discard() {
        if (!content) return;
        setSheet(null);
        const sets = content.exercises.reduce((n, e) => n + e.exercise.sets.length, 0);
        setConfirm({ kind: 'discard', sets });
      },
      async confirmDiscard() {
        setConfirm(null);
        await discardWorkout.execute();
      },
      closeConfirm: () => setConfirm(null),
    },
  };
}

const NO_IDS: ReadonlySet<Id> = new Set();
