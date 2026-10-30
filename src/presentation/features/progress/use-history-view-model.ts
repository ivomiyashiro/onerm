import { useEffect, useState } from 'react';

import type { Id } from '@/domain/models/vocabulary';
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

/** D16 for a swiped workout (RF-PROG-03.AC4 from S18): its sets, for «Se eliminan … {n} series». */
export interface HistoryConfirm {
  workoutId: Id;
  sets: number;
}

export interface HistoryViewModel {
  state: HistoryState;
  confirm: HistoryConfirm | null;
  actions: {
    retry(): void;
    askDelete(item: HistoryItem): void;
    confirmDelete(): Promise<void>;
    closeConfirm(): void;
  };
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

/**
 * S18 · Historial (RF-PROG-01): the finished workouts from the local database. A swiped row is
 * deleted after D16 (RF-PROG-03.AC4, #322).
 */
export function useHistoryViewModel(): HistoryViewModel {
  const { observeHistory, deleteWorkout } = useUseCases();
  const [state, setState] = useState<HistoryState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [confirm, setConfirm] = useState<HistoryConfirm | null>(null);

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
    confirm,
    actions: {
      retry() {
        setState({ status: 'loading' });
        setAttempt((n) => n + 1);
      },
      askDelete: (item) => setConfirm({ workoutId: item.id, sets: item.sets }),
      // The row leaves on its own: the history observes the database (RN-SYNC-01).
      async confirmDelete() {
        const target = confirm;
        setConfirm(null);
        if (target !== null) await deleteWorkout.execute(target.workoutId);
      },
      closeConfirm: () => setConfirm(null),
    },
  };
}
