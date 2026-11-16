import { useEffect } from 'react';

import { useAppStore } from '@/presentation/state/app-store-context';
import { useAuthUseCases } from '@/presentation/use-cases/use-cases-context';

/**
 * RF-AUTH-06.AC4: when the server ends the session, S21 says so (and offers to come back in) while
 * everything else keeps working, a workout in progress included. Renders nothing.
 */
export function SessionWatcher() {
  const { observeSessionLoss } = useAuthUseCases();
  const markSessionExpired = useAppStore((s) => s.markSessionExpired);

  useEffect(
    () => observeSessionLoss.execute(markSessionExpired),
    [observeSessionLoss, markSessionExpired],
  );

  return null;
}
