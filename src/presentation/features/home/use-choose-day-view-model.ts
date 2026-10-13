import { useEffect, useState } from 'react';

import type { Id } from '@/domain/models/vocabulary';
import type { DayChoice, NextDayOverview } from '@/domain/usecases/observe-next-day';
import { useUseCases } from '@/presentation/use-cases/use-cases-context';

export type ChooseDayState =
  | { status: 'loading' }
  | {
      status: 'content';
      routineName: string;
      days: DayChoice[];
      /** The next day by the rotation (RN-RUT-01). */
      recommendedId: Id;
      selectedId: Id;
    }
  /** No active routine any more, or the read failed: there is nothing to choose. */
  | { status: 'unavailable' };

export interface ChooseDayViewModel {
  state: ChooseDayState;
  actions: { select(id: Id): void; start(): Promise<void> };
}

/** S08 · Elegir día (RF-ENT-01.AC3): every day of the active routine, and start the chosen one. */
export function useChooseDayViewModel(onStarted: () => void): ChooseDayViewModel {
  const { observeNextDay, startWorkout } = useUseCases();
  const [overview, setOverview] = useState<NextDayOverview | 'loading' | 'error'>('loading');
  const [selectedId, setSelectedId] = useState<Id | null>(null);

  useEffect(
    () =>
      observeNextDay.execute({
        next: setOverview,
        error: () => setOverview('error'),
      }),
    [observeNextDay],
  );

  const state: ChooseDayState =
    overview === 'loading'
      ? { status: 'loading' }
      : overview === 'error' || overview.kind === 'noActiveRoutine'
        ? { status: 'unavailable' }
        : {
            status: 'content',
            routineName: overview.routine.name,
            days: overview.days,
            recommendedId: overview.day.id,
            selectedId: selectedId ?? overview.day.id,
          };

  async function start() {
    if (state.status !== 'content') return;
    const result = await startWorkout.execute(state.selectedId);
    if (result.status !== 'missing') onStarted();
  }

  return { state, actions: { select: setSelectedId, start } };
}
