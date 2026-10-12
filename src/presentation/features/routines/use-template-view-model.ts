import { useEffect, useRef, useState } from 'react';

import type { Id } from '@/domain/models/vocabulary';
import type { TemplateDetail } from '@/domain/usecases/observe-template';
import type { RoutinesDialog } from '@/presentation/features/routines/routine-change-dialog';
import { useUseCases } from '@/presentation/use-cases/use-cases-context';

export type TemplateState =
  | { status: 'loading' }
  | { status: 'content'; detail: TemplateDetail }
  /** Not in the local catalog: an unknown link. */
  | { status: 'notFound' }
  | { status: 'error' };

export interface TemplateViewModel {
  state: TemplateState;
  /** D07 or D14. */
  dialog: RoutinesDialog | null;
  actions: {
    /** «Usar esta rutina» (RF-RUT-02). */
    use(): Promise<void>;
    confirmDialog(): Promise<void>;
    dismissDialog(): void;
    retry(): void;
  };
}

/** S14 · Detalle de plantilla (RF-RUT-01, 02). `onAdopted` runs once the copy is active. */
export function useTemplateViewModel(templateId: Id, onAdopted: () => void): TemplateViewModel {
  const { observeTemplate, adoptTemplate } = useUseCases();
  const [state, setState] = useState<TemplateState>({ status: 'loading' });
  const [dialog, setDialog] = useState<RoutinesDialog | null>(null);
  // Changing it re-runs the effect, which subscribes again.
  const [attempt, setAttempt] = useState(0);
  // A ref, not state: two taps in the same frame must not copy the template twice.
  const adopting = useRef(false);

  useEffect(
    () =>
      observeTemplate.execute(templateId, {
        next: (detail) =>
          setState(detail === null ? { status: 'notFound' } : { status: 'content', detail }),
        error: () => setState({ status: 'error' }),
      }),
    [observeTemplate, templateId, attempt],
  );

  async function adopt() {
    if (adopting.current) return;
    adopting.current = true;
    setDialog(null);
    try {
      const result = await adoptTemplate.execute(templateId);
      if (result.status === 'workoutInProgress') {
        setDialog({ kind: 'workoutInProgress', action: 'changeRoutine' });
      } else {
        onAdopted();
      }
    } catch {
      // A failed local write: the screen stays, and no copy is retried behind the user's back.
    } finally {
      adopting.current = false;
    }
  }

  async function use() {
    if (state.status !== 'content') return;
    const { detail } = state;
    if (detail.hasWorkoutInProgress) {
      setDialog({ kind: 'workoutInProgress', action: 'changeRoutine' });
    } else if (detail.activeRoutine !== null) {
      setDialog({
        kind: 'replaceActive',
        routineName: detail.template.name,
        activeName: detail.activeRoutine.name,
      });
    } else {
      await adopt();
    }
  }

  async function confirmDialog() {
    if (dialog?.kind === 'replaceActive') await adopt();
    else setDialog(null);
  }

  function retry() {
    setState({ status: 'loading' });
    setAttempt((n) => n + 1);
  }

  return {
    state,
    dialog,
    actions: { use, confirmDialog, dismissDialog: () => setDialog(null), retry },
  };
}
