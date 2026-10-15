import { useEffect, useState } from 'react';

import { useAppStore } from '@/presentation/state/app-store-context';
import { useUseCases } from '@/presentation/use-cases/use-cases-context';

export type StartupState = { status: 'preparing' } | { status: 'ready' } | { status: 'error' };

export interface StartupViewModel {
  state: StartupState;
  actions: { retry(): void };
}

/**
 * App start (08 §3, 07 §6): prepares the local database and reads the account before the UI
 * mounts. If a migration
 * fails, the screen offers to retry; the data is never deleted.
 */
export function useStartupViewModel(): StartupViewModel {
  const { prepareLocalData, readAccount } = useUseCases();
  const setAccount = useAppStore((s) => s.setAccount);
  const [state, setState] = useState<StartupState>({ status: 'preparing' });
  // Changing it re-runs the effect, which prepares again.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    prepareLocalData
      .execute()
      // Whose data this is and whether the session is alive, before any screen shows (RF-AUTH-06).
      // If it can't be read, the device is treated as a guest's: the data is still there.
      .then(() => readAccount.execute().catch(() => ({ kind: 'guest' }) as const))
      .then(
        (account) => {
          if (!active) return;
          setAccount(account);
          setState({ status: 'ready' });
        },
        () => active && setState({ status: 'error' }),
      );
    return () => {
      active = false;
    };
  }, [prepareLocalData, readAccount, setAccount, attempt]);

  function retry() {
    setState({ status: 'preparing' });
    setAttempt((n) => n + 1);
  }

  return { state, actions: { retry } };
}
