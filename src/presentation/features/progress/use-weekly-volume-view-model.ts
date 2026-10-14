import { useEffect, useState } from 'react';

import type { WeeklyVolume } from '@/domain/usecases/observe-weekly-volume';
import { useUseCases } from '@/presentation/use-cases/use-cases-context';

export type WeeklyVolumeState =
  { status: 'loading' } | { status: 'content'; volume: WeeklyVolume } | { status: 'error' };

export interface WeeklyVolumeViewModel {
  state: WeeklyVolumeState;
  /** 0 is «Esta semana»; there is no week after it. */
  weeksAgo: number;
  actions: { previousWeek(): void; nextWeek(): void };
}

/** S18 · Volumen (RF-PROG-06): this week first, and the earlier ones (AC2). */
export function useWeeklyVolumeViewModel(): WeeklyVolumeViewModel {
  const { observeWeeklyVolume } = useUseCases();
  const [weeksAgo, setWeeksAgo] = useState(0);
  const [state, setState] = useState<WeeklyVolumeState>({ status: 'loading' });

  useEffect(
    () =>
      observeWeeklyVolume.execute(weeksAgo, {
        next: (volume) => setState({ status: 'content', volume }),
        error: () => setState({ status: 'error' }),
      }),
    [observeWeeklyVolume, weeksAgo],
  );

  return {
    state,
    weeksAgo,
    actions: {
      previousWeek: () => setWeeksAgo((n) => n + 1),
      nextWeek: () => setWeeksAgo((n) => Math.max(0, n - 1)),
    },
  };
}
