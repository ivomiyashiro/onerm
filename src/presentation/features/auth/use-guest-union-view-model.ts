import { useCallback, useEffect, useRef, useState } from 'react';

import type { GuestSummary } from '@/domain/repositories/guest-union';
import type { PendingUnion } from '@/domain/usecases/guest-union';
import { useAppStore } from '@/presentation/state/app-store-context';
import { useUseCases } from '@/presentation/use-cases/use-cases-context';

/** D01 or D01b, with what the guest has on the phone; `offline` once a choice found no connection. */
export interface GuestUnionDialog {
  kind: 'ask' | 'confirmDiscard';
  summary: GuestSummary;
  offline: boolean;
}

export interface GuestUnionViewModel {
  dialog: GuestUnionDialog | null;
  actions: {
    /** D01 «Sumar a mi cuenta» (AC3). */
    merge(): Promise<void>;
    /** D01 «Descartar»: asks to confirm (D01b, AC4). */
    discard(): void;
    /** D01b «Descartar». */
    confirmDiscard(): Promise<void>;
    /** D01b «Cancelar»: back to D01. */
    back(): void;
    /** D01 «Cancelar» (AC9). */
    cancel(): Promise<void>;
  };
}

/**
 * The union of the guest's data with the account (RF-AUTH-05, 07 §4.3), wherever the person is:
 * after entering an account on a guest device, and when the app opens with a union left halfway
 * (AC10). Without connection it waits for the next try; the device stays the guest's.
 */
export function useGuestUnionViewModel(): GuestUnionViewModel {
  const { readPendingUnion, startGuestUnion, finishGuestUnion, cancelGuestUnion, syncNow } =
    useUseCases();
  const unionRequests = useAppStore((s) => s.unionRequests);
  const setAccount = useAppStore((s) => s.setAccount);
  const [dialog, setDialog] = useState<GuestUnionDialog | null>(null);
  const pending = useRef<PendingUnion | null>(null);
  // A ref, not state: two taps in the same frame must act only once.
  const busy = useRef(false);

  const united = useCallback(
    ({ userId, email }: PendingUnion) => {
      setDialog(null);
      setAccount({ kind: 'user', userId, email, sessionExpired: false });
      // Step 6: the guest's data goes up and the account's comes down (07 §4.2).
      void syncNow.execute();
    },
    [setAccount, syncNow],
  );

  useEffect(() => {
    let active = true;
    (async () => {
      const waiting = await readPendingUnion.execute();
      if (!active || waiting === null) return;
      pending.current = waiting;
      const start = await startGuestUnion.execute(waiting);
      if (!active) return;
      if (start.kind === 'united') united(waiting);
      else if (start.kind === 'ask') {
        setDialog({ kind: 'ask', summary: start.summary, offline: false });
      }
    })().catch(() => undefined);
    return () => {
      active = false;
    };
  }, [unionRequests, readPendingUnion, startGuestUnion, united]);

  async function act(work: (waiting: PendingUnion) => Promise<void>) {
    const waiting = pending.current;
    if (waiting === null || busy.current) return;
    busy.current = true;
    try {
      await work(waiting);
    } catch {
      // A failed local write leaves the guest's data as it was; the dialog stays to try again.
    } finally {
      busy.current = false;
    }
  }

  async function finish(choice: 'merge' | 'discard') {
    await act(async (waiting) => {
      const result = await finishGuestUnion.execute({ ...waiting, choice });
      if (result === 'done') united(waiting);
      // The choice stays to retry; D01 says it needs the connection (13 §9).
      else setDialog((d) => d && { kind: 'ask', summary: d.summary, offline: true });
    });
  }

  return {
    dialog,
    actions: {
      merge: () => finish('merge'),
      discard: () => setDialog((d) => d && { ...d, kind: 'confirmDiscard', offline: false }),
      confirmDiscard: () => finish('discard'),
      back: () => setDialog((d) => d && { ...d, kind: 'ask', offline: false }),
      cancel: () =>
        act(async () => {
          await cancelGuestUnion.execute();
          pending.current = null;
          setDialog(null);
        }),
    },
  };
}
