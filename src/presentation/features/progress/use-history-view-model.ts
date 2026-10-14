import { useEffect, useState } from 'react';

import type { HistoryItem } from '@/domain/usecases/observe-history';
import { common } from '@/presentation/strings/common';
import { progress as text } from '@/presentation/strings/progress';
import { useUseCases } from '@/presentation/use-cases/use-cases-context';

/** A month of S18 (Figma «S18 · Historial»): «octubre 2026» and its workouts. */
export interface HistoryMonth {
  key: string;
  title: string;
  items: HistoryItem[];
}

export type HistoryState =
  | { status: 'loading' }
  | { status: 'content'; months: HistoryMonth[] }
  /** RF-PROG-01.AC3. */
  | { status: 'empty' }
  | { status: 'error' };

export interface HistoryViewModel {
  state: HistoryState;
  actions: { retry(): void };
}

/** Groups the history, newest first, by month in the device time zone. */
function monthsOf(items: readonly HistoryItem[]): HistoryMonth[] {
  const months: HistoryMonth[] = [];
  for (const item of items) {
    const at = item.finishedAt;
    const key = `${at.getFullYear()}-${at.getMonth()}`;
    const last = months.at(-1);
    if (last?.key === key) last.items.push(item);
    else {
      const title = text.overview.monthYear(common.months[at.getMonth()], at.getFullYear());
      months.push({ key, title, items: [item] });
    }
  }
  return months;
}

/** S18 · Historial (RF-PROG-01): the finished workouts from the local database. */
export function useHistoryViewModel(): HistoryViewModel {
  const { observeHistory } = useUseCases();
  const [state, setState] = useState<HistoryState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(
    () =>
      observeHistory.execute({
        next: (items) =>
          setState(
            items.length === 0
              ? { status: 'empty' }
              : { status: 'content', months: monthsOf(items) },
          ),
        error: () => setState({ status: 'error' }),
      }),
    [observeHistory, attempt],
  );

  return {
    state,
    actions: {
      retry() {
        setState({ status: 'loading' });
        setAttempt((n) => n + 1);
      },
    },
  };
}
