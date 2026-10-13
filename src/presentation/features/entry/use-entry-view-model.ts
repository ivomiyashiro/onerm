import { useEffect, useState } from 'react';

import type { Entry } from '@/domain/usecases/observe-entry';
import { useUseCases } from '@/presentation/use-cases/use-cases-context';

export type EntryState =
  { status: 'loading' } | { status: 'ready'; entry: Entry } | { status: 'error' };

export interface EntryViewModel {
  state: EntryState;
  actions: { retry(): void };
}

/** Which screens the app shows (08 §3), observed: answering the onboarding moves it along. */
export function useEntryViewModel(): EntryViewModel {
  const { observeEntry } = useUseCases();
  const [state, setState] = useState<EntryState>({ status: 'loading' });
  // Changing it re-runs the effect, which subscribes again.
  const [attempt, setAttempt] = useState(0);

  useEffect(
    () =>
      observeEntry.execute({
        next: (entry) => setState({ status: 'ready', entry }),
        error: () => setState({ status: 'error' }),
      }),
    [observeEntry, attempt],
  );

  function retry() {
    setState({ status: 'loading' });
    setAttempt((n) => n + 1);
  }

  return { state, actions: { retry } };
}
