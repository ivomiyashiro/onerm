import { useEffect, useRef, useState } from 'react';

import type { RejectedChange } from '@/domain/models/rejected-change';
import { useUseCases } from '@/presentation/use-cases/use-cases-context';

export type RejectedChangesState =
  | { status: 'loading' }
  | { status: 'content'; changes: RejectedChange[] }
  /** «Todo respaldado». */
  | { status: 'empty' }
  | { status: 'error' };

/** D12 open on a change; `offline` once discarding found no connection. */
export interface RejectedChangeDialog {
  change: RejectedChange;
  offline: boolean;
}

export interface RejectedChangesViewModel {
  state: RejectedChangesState;
  dialog: RejectedChangeDialog | null;
  actions: {
    open(change: RejectedChange): void;
    close(): void;
    /** D12 «Descartar este cambio». */
    discard(): Promise<void>;
    /** D12 «Reintentar». */
    retry(): Promise<void>;
  };
}

/** S25 · Cambios que no se pudieron respaldar, and D12 (RF-SYNC-06.AC4, RN-SYNC-11). */
export function useRejectedChangesViewModel(): RejectedChangesViewModel {
  const { observeRejectedChanges, discardRejectedChange, retryRejectedChange } = useUseCases();
  const [state, setState] = useState<RejectedChangesState>({ status: 'loading' });
  const [dialog, setDialog] = useState<RejectedChangeDialog | null>(null);
  // A ref, not state: two taps in the same frame must act only once.
  const busy = useRef(false);

  useEffect(
    () =>
      observeRejectedChanges.execute({
        next: (changes) =>
          setState(changes.length === 0 ? { status: 'empty' } : { status: 'content', changes }),
        error: () => setState({ status: 'error' }),
      }),
    [observeRejectedChanges],
  );

  async function act(work: (change: RejectedChange) => Promise<void>) {
    if (dialog === null || busy.current) return;
    busy.current = true;
    try {
      await work(dialog.change);
    } catch {
      // A failed local write leaves the change as it was; D12 stays to try again.
    } finally {
      busy.current = false;
    }
  }

  return {
    state,
    dialog,
    actions: {
      open: (change) => setDialog({ change, offline: false }),
      close: () => setDialog(null),
      discard: () =>
        act(async (change) => {
          const result = await discardRejectedChange.execute(change);
          setDialog(result === 'offline' ? { change, offline: true } : null);
        }),
      retry: () =>
        act(async (change) => {
          setDialog(null);
          await retryRejectedChange.execute(change);
        }),
    },
  };
}
