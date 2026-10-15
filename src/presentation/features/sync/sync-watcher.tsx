import { useEffect } from 'react';

import { useUseCases } from '@/presentation/use-cases/use-cases-context';

/**
 * RF-SYNC-01: backs the local changes up on its own while the app runs, on the triggers of
 * RN-SYNC-06. Nothing is shown and nothing waits for it (RNF-10). Renders nothing.
 */
export function SyncWatcher() {
  const { keepBackedUp } = useUseCases();

  useEffect(() => keepBackedUp.execute(), [keepBackedUp]);

  return null;
}
