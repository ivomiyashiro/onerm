import type { BackupNotice } from '@/domain/usecases/observe-backup-notice';
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
  /** The start of the workout in progress: the card says «En curso · 18:42» (RF-ENT-01.AC4). */
  inProgressSince: Date | null;
  /** RF-SYNC-06.AC2: changes waiting to be backed up, or null. */
  backupNotice: BackupNotice | null;
  actions: {
    retry(): void;
    /**
     * RF-ENT-01.AC1, AC4: «Empezar» in the card starts the next day, or «Continuar» the one in
     * progress. True when there is a workout to open.
     */
    start(): Promise<boolean>;
  };
}

/** S07 · Inicio: the next day of the active routine (RN-RUT-01), from the local database. */
export function useHomeViewModel(): HomeViewModel {
  const { observeNextDay, observeWorkoutInProgress, observeBackupNotice, startWorkout } =
    useUseCases();
  const [backupNotice, setBackupNotice] = useState<BackupNotice | null>(null);
  const [inProgressSince, setInProgressSince] = useState<Date | null>(null);
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

  useEffect(
    () =>
      observeWorkoutInProgress.execute({
        next: (workout) => setInProgressSince(workout?.startedAt ?? null),
        // The card falls back to «Hoy toca»; the read error of the next day is the one shown.
        error: () => setInProgressSince(null),
      }),
    [observeWorkoutInProgress],
  );

  useEffect(
    () =>
      observeBackupNotice.execute({
        next: setBackupNotice,
        // Only a notice: without it S07 shows the same.
        error: () => setBackupNotice(null),
      }),
    [observeBackupNotice],
  );

  function retry() {
    setState({ status: 'loading' });
    setAttempt((n) => n + 1);
  }

  async function start() {
    if (inProgressSince !== null) return true;
    if (state.status !== 'content') return false;
    const result = await startWorkout.execute(state.nextDay.day.id);
    return result.status !== 'missing';
  }

  return { state, inProgressSince, backupNotice, actions: { retry, start } };
}
