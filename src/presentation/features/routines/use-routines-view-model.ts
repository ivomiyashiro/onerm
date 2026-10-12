import { useEffect, useState } from 'react';

import type { Id } from '@/domain/models/vocabulary';
import type { RoutineChange } from '@/domain/usecases/routine-change';
import type { RoutinesOverview } from '@/domain/usecases/observe-routines';
import type { RoutinesDialog } from '@/presentation/features/routines/routine-change-dialog';
import { useUseCases } from '@/presentation/use-cases/use-cases-context';

export type RoutinesState =
  { status: 'loading' } | { status: 'content'; overview: RoutinesOverview } | { status: 'error' };

export interface RoutinesViewModel {
  state: RoutinesState;
  dialog: RoutinesDialog | null;
  actions: {
    /** RF-RUT-07: D07 first when another routine is active. */
    activate(routineId: Id): Promise<void>;
    /** RF-RUT-08: always confirmed with D11. */
    remove(routineId: Id): Promise<void>;
    confirmDialog(): Promise<void>;
    dismissDialog(): void;
    retry(): void;
  };
}

/** What runs when the open dialog is confirmed. */
type Pending = { dialog: RoutinesDialog; run?: () => Promise<RoutineChange> };

/** S13 · Rutinas (RF-RUT-01, 07, 08), observed from the local database. */
export function useRoutinesViewModel(): RoutinesViewModel {
  const { observeRoutines, activateRoutine, deleteRoutine } = useUseCases();
  const [state, setState] = useState<RoutinesState>({ status: 'loading' });
  const [pending, setPending] = useState<Pending | null>(null);
  // Changing it re-runs the effect, which subscribes again.
  const [attempt, setAttempt] = useState(0);

  useEffect(
    () =>
      observeRoutines.execute({
        next: (overview) => setState({ status: 'content', overview }),
        error: () => setState({ status: 'error' }),
      }),
    [observeRoutines, attempt],
  );

  const overview = state.status === 'content' ? state.overview : null;
  const nameOf = (id: Id | null) => overview?.routines.find((r) => r.id === id)?.name ?? '';

  /** Runs a change, and shows D14 if a workout started meanwhile (RN-RUT-09). */
  async function apply(
    run: () => Promise<RoutineChange>,
    action: 'changeRoutine' | 'deleteRoutine',
  ) {
    setPending(null);
    try {
      const result = await run();
      if (result.status === 'workoutInProgress') {
        setPending({ dialog: { kind: 'workoutInProgress', action } });
      }
    } catch {
      // A failed local write changes nothing: the list keeps showing what is stored.
    }
  }

  async function activate(routineId: Id) {
    if (overview === null) return;
    if (overview.hasWorkoutInProgress) {
      setPending({ dialog: { kind: 'workoutInProgress', action: 'changeRoutine' } });
      return;
    }
    const run = () => activateRoutine.execute(routineId);
    if (overview.activeRoutineId === null) return apply(run, 'changeRoutine');
    setPending({
      dialog: {
        kind: 'replaceActive',
        routineName: nameOf(routineId),
        activeName: nameOf(overview.activeRoutineId),
      },
      run,
    });
  }

  async function remove(routineId: Id) {
    if (overview === null) return;
    if (overview.hasWorkoutInProgress && overview.activeRoutineId === routineId) {
      setPending({ dialog: { kind: 'workoutInProgress', action: 'deleteRoutine' } });
      return;
    }
    setPending({
      dialog: { kind: 'delete', routineName: nameOf(routineId) },
      run: () => deleteRoutine.execute(routineId),
    });
  }

  async function confirmDialog() {
    if (pending?.run === undefined) return setPending(null);
    const action = pending.dialog.kind === 'delete' ? 'deleteRoutine' : 'changeRoutine';
    await apply(pending.run, action);
  }

  function retry() {
    setState({ status: 'loading' });
    setAttempt((n) => n + 1);
  }

  return {
    state,
    dialog: pending?.dialog ?? null,
    actions: { activate, remove, confirmDialog, dismissDialog: () => setPending(null), retry },
  };
}
