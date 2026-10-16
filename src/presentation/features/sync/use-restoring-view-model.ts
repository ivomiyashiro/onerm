import { useEffect, useState } from 'react';

import type { Restoration } from '@/domain/usecases/observe-restoration';
import { useUseCases } from '@/presentation/use-cases/use-cases-context';

export interface RestoringViewModel {
  state: Restoration;
  actions: {
    /** «Continuar» after the restoration was cut short (RF-SYNC-03.AC2). */
    continue(): Promise<void>;
  };
}

/**
 * S23 · Restaurando tus datos (RF-SYNC-03): the progress of the sync that restores the account.
 * The entry leaves S23 by itself once the account's profile arrives; when the sync ends without
 * one (a new account), the onboarding begins (07 §4.2, AC3).
 */
export function useRestoringViewModel(): RestoringViewModel {
  const { observeRestoration, continueAfterAuth } = useUseCases();
  const [state, setState] = useState<Restoration>({ status: 'starting' });

  useEffect(() => observeRestoration.execute(setState), [observeRestoration]);

  const finished = state.status === 'finished';
  useEffect(() => {
    // A failed local write leaves S23 as it is; the next sync tries again.
    if (finished) continueAfterAuth.execute().catch(() => undefined);
  }, [finished, continueAfterAuth]);

  return {
    state,
    actions: {
      continue: async () => {
        await continueAfterAuth.execute({ evenIfRestoring: true }).catch(() => undefined);
      },
    },
  };
}
