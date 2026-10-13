import { useEffect, useRef, useState } from 'react';

import type { Recommendation } from '@/domain/usecases/observe-recommendation';
import { useUseCases } from '@/presentation/use-cases/use-cases-context';

export type RecommendationState =
  | { status: 'loading' }
  | { status: 'content'; recommendation: Recommendation }
  | { status: 'error' };

/** Where S06 leaves to: Inicio, or the templates of S13 (RF-PERF-02.AC3). */
export type RecommendationExit = 'home' | 'templates';

export interface RecommendationViewModel {
  state: RecommendationState;
  actions: {
    /** RF-PERF-02.AC2: adopts the template (RF-RUT-02). */
    start(): Promise<void>;
    seeOthers(): Promise<void>;
    /** RF-PERF-02.AC5: Inicio without an active routine. */
    notNow(): Promise<void>;
    retry(): void;
  };
}

/**
 * S06 · Recomendación (RF-PERF-02). Every choice ends the onboarding; `onDone` runs once the
 * entry flow already shows the app (08 §3), so the tabs exist when it navigates.
 */
export function useRecommendationViewModel(
  onDone: (exit: RecommendationExit) => void,
): RecommendationViewModel {
  const { observeRecommendation, observeEntry, adoptTemplate, finishOnboarding } = useUseCases();
  const [state, setState] = useState<RecommendationState>({ status: 'loading' });
  // Changing it re-runs the effect, which subscribes again.
  const [attempt, setAttempt] = useState(0);
  const [exit, setExit] = useState<RecommendationExit | null>(null);
  const [inApp, setInApp] = useState(false);
  // A ref, not state: two taps in the same frame must not adopt twice.
  const busy = useRef(false);

  useEffect(
    () =>
      observeRecommendation.execute({
        next: (recommendation) =>
          setState(
            recommendation === null ? { status: 'error' } : { status: 'content', recommendation },
          ),
        error: () => setState({ status: 'error' }),
      }),
    [observeRecommendation, attempt],
  );

  useEffect(
    () =>
      observeEntry.execute({
        next: (entry) => setInApp(entry.kind === 'app'),
        // EntryGate shows a failed read.
        error: () => {},
      }),
    [observeEntry],
  );

  useEffect(() => {
    if (exit !== null && inApp) onDone(exit);
  }, [exit, inApp, onDone]);

  async function finish(next: RecommendationExit, before?: () => Promise<unknown>) {
    if (busy.current) return;
    busy.current = true;
    try {
      await before?.();
      await finishOnboarding.execute();
      setExit(next);
    } catch {
      // A failed local write: S06 stays, and the next tap tries again.
    } finally {
      busy.current = false;
    }
  }

  async function start() {
    if (state.status !== 'content') return;
    const { id } = state.recommendation.template;
    await finish('home', () => adoptTemplate.execute(id));
  }

  function retry() {
    setState({ status: 'loading' });
    setAttempt((n) => n + 1);
  }

  return {
    state,
    actions: {
      start,
      seeOthers: () => finish('templates'),
      notNow: () => finish('home'),
      retry,
    },
  };
}
