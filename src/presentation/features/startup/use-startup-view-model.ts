import { useEffect, useState } from 'react';

import { useUseCases } from '@/presentation/use-cases/use-cases-context';

export type StartupState = { status: 'preparing' } | { status: 'ready' } | { status: 'error' };

export interface StartupViewModel {
  state: StartupState;
  actions: { retry(): void };
}

/**
 * App start (08 §3, 07 §6): prepares the local database before the UI mounts. If a migration
 * fails, the screen offers to retry; the data is never deleted.
 */
export function useStartupViewModel(): StartupViewModel {
  const { prepareLocalData } = useUseCases();
  const [state, setState] = useState<StartupState>({ status: 'preparing' });
  // Changing it re-runs the effect, which prepares again.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    prepareLocalData.execute().then(
      () => active && setState({ status: 'ready' }),
      () => active && setState({ status: 'error' }),
    );
    return () => {
      active = false;
    };
  }, [prepareLocalData, attempt]);

  function retry() {
    setState({ status: 'preparing' });
    setAttempt((n) => n + 1);
  }

  return { state, actions: { retry } };
}
