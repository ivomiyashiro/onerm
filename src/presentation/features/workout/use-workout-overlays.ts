import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';

import type { Exercise } from '@/domain/models/exercise';
import type { Id } from '@/domain/models/vocabulary';
import type { WorkoutSet } from '@/domain/models/workout';
import {
  substituteOptions,
  type SubstituteOptions,
} from '@/domain/rules/workout/substitute-options';
import type { WhyDetail } from '@/presentation/shared/reason-text';
import type { SetForm, SetFormErrors } from '@/presentation/shared/set/set-form';
import { useExercisesUseCases } from '@/presentation/use-cases/use-cases-context';

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

export interface WorkoutOverlays {
  /** The open sheet as the actions read it. */
  sheet: WorkoutSheet | null;
  /** The open sheet as S09 shows it: S11 with its options from the catalog. */
  shownSheet: WorkoutSheet | null;
  /** «Serie eliminada · Deshacer» (RF-ENT-04.AC2). */
  deleted: WorkoutSet | null;
  confirm: WorkoutConfirm | null;
  setSheet: Dispatch<SetStateAction<WorkoutSheet | null>>;
  setDeleted: Dispatch<SetStateAction<WorkoutSet | null>>;
  setConfirm: Dispatch<SetStateAction<WorkoutConfirm | null>>;
  /** The actions that only open, edit or close an overlay. */
  actions: {
    editForm(change: (form: SetForm) => SetForm): void;
    dismissUndo(): void;
    openExercises(): void;
    closeSheet(): void;
    openHowTo(): void;
    openWorkoutMenu(): void;
    openSubstitute(): void;
    searchSubstitute(query: string): void;
    closeConfirm(): void;
  };
}

/** The sheets, dialogs and undo bar of S09; `exerciseId` is the current exercise's, for S11. */
export function useWorkoutOverlays(exerciseId: Id | null): WorkoutOverlays {
  const { observeExercises } = useExercisesUseCases();
  const [sheet, setSheet] = useState<WorkoutSheet | null>(null);
  const [deleted, setDeleted] = useState<WorkoutSet | null>(null);
  const [confirm, setConfirm] = useState<WorkoutConfirm | null>(null);
  const [catalog, setCatalog] = useState<Exercise[]>([]);

  // S11 reads the catalog only while it is open.
  const substituting = sheet?.kind === 'substitute';
  useEffect(() => {
    if (!substituting) return;
    return observeExercises.execute({ next: setCatalog, error: () => setCatalog([]) });
  }, [substituting, observeExercises]);

  const shownSheet: WorkoutSheet | null =
    sheet?.kind === 'substitute' && exerciseId !== null
      ? { ...sheet, options: substituteOptions(catalog, exerciseId, sheet.query) }
      : sheet;

  return {
    sheet,
    shownSheet,
    deleted,
    confirm,
    setSheet,
    setDeleted,
    setConfirm,
    actions: {
      editForm(change) {
        setSheet((open) =>
          open?.kind === 'adjust' || open?.kind === 'edit'
            ? { ...open, form: change(open.form), errors: null }
            : open,
        );
      },
      dismissUndo: () => setDeleted(null),
      openExercises: () => setSheet({ kind: 'exercises' }),
      closeSheet: () => setSheet(null),
      openHowTo: () => setSheet({ kind: 'howTo' }),
      openWorkoutMenu: () => setSheet({ kind: 'workoutMenu' }),
      openSubstitute: () =>
        setSheet({ kind: 'substitute', query: '', options: { sameMuscle: [], others: [] } }),
      searchSubstitute: (query) =>
        setSheet((open) => (open?.kind === 'substitute' ? { ...open, query } : open)),
      closeConfirm: () => setConfirm(null),
    },
  };
}
