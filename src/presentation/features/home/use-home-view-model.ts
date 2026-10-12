import { useEffect, useState } from 'react';

import type { NextDayOverview } from '@/domain/usecases/observe-next-day';
import { useUseCases } from '@/presentation/use-cases/use-cases-context';

type NextDay = Extract<NextDayOverview, { kind: 'nextDay' }>;

export type HomeState =
  | { status: 'loading' }
  | { status: 'content'; nextDay: NextDay }
  /** No active routine (RF-RUT-08.AC2): «Elegir una rutina» and «Crear rutina». */
  | { status: 'empty' }
  | { status: 'error' };

export interface HomeViewModel {
  state: HomeState;
  actions: { retry(): void };
}

/** S07 · Inicio: the next day of the active routine (RN-RUT-01), from the local database. */
export function useHomeViewModel(): HomeViewModel {
  const { observeNextDay } = useUseCases();
  const [state, setState] = useState<HomeState>({ status: 'loading' });
  // Changing it re-runs the effect, which subscribes again.
  const [attempt, setAttempt] = useState(0);

  useEffect(
    () =>
      observeNextDay.execute({
        next: (overview) =>
          setState(
            overview.kind === 'nextDay'
              ? { status: 'content', nextDay: overview }
              : { status: 'empty' },
          ),
        error: () => setState({ status: 'error' }),
      }),
    [observeNextDay, attempt],
  );

  function retry() {
    setState({ status: 'loading' });
    setAttempt((n) => n + 1);
  }

  return { state, actions: { retry } };
}
