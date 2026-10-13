import { useRef } from 'react';

import { useUseCases } from '@/presentation/use-cases/use-cases-context';

export interface WelcomeViewModel {
  actions: {
    /** RF-AUTH-01: the entry flow then moves on to the onboarding by itself (08 §3). */
    continueAsGuest(): Promise<void>;
  };
}

/** S01 · Bienvenida. */
export function useWelcomeViewModel(): WelcomeViewModel {
  const { startAsGuest } = useUseCases();
  // A ref, not state: two taps in the same frame must start only once.
  const starting = useRef(false);

  async function continueAsGuest() {
    if (starting.current) return;
    starting.current = true;
    try {
      await startAsGuest.execute();
    } catch {
      // A failed local write: S01 stays, and the next tap tries again.
    } finally {
      starting.current = false;
    }
  }

  return { actions: { continueAsGuest } };
}
