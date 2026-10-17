import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import type { RestTimer } from '@/domain/models/rest-timer';
import type { Id } from '@/domain/models/vocabulary';
import type { WorkoutOverview } from '@/domain/usecases/observe-workout';
import { restViewOf, type RestView } from '@/presentation/features/workout/rest-view';
import { workout as text } from '@/presentation/strings/workout';
import { useUseCases } from '@/presentation/use-cases/use-cases-context';

export type RestDialog = 'notifications' | 'exactAlarms';
export type RestNotice = 'notifications' | 'exactAlarms';

export interface Rest {
  rest: RestView | null;
  /** The bar over «Hecho» instead of the full screen (08 §5). */
  restMinimized: boolean;
  /** D05, then D17 (RF-ENT-06.AC9). */
  dialog: RestDialog | null;
  /** The discreet notice of S09 (RF-ENT-06.AC7, AC10). */
  notice: RestNotice | null;
  /** After a set is logged: the rest starts, except after a warm-up (RN-ENT-12). */
  onLogged(input: { isWarmup: boolean; restSeconds: number }): Promise<void>;
  actions: {
    addRest(): Promise<void>;
    restartRest(): Promise<void>;
    skipRest(): Promise<void>;
    minimizeRest(): void;
    expandRest(): void;
    allowNotifications(): Promise<void>;
    dismissDialog(): Promise<void>;
    openExactAlarmSettings(): Promise<void>;
    openNotice(): Promise<void>;
  };
}

const PROVISIONAL = { title: text.restNotification.title, body: '' };

/**
 * The rest of S09 (RF-ENT-06, RN-ENT-07): the absolute end comes from the database, and the
 * countdown is drawn by the screen. The notice is scheduled again whenever what it would say
 * changes, so it always names the next set.
 */
export function useRest(
  overview: WorkoutOverview | null,
  extraOf: (workoutExerciseId: Id) => number,
): Rest {
  const {
    observeRestTimer,
    startRest,
    addRestTime,
    rescheduleRest,
    skipRest,
    askRestPermission,
    readRestPermissions,
  } = useUseCases();
  const [timer, setTimer] = useState<RestTimer | null>(null);
  const [restMinimized, setRestMinimized] = useState(false);
  const [dialog, setDialog] = useState<RestDialog | null>(null);
  const [notice, setNotice] = useState<RestNotice | null>(null);

  useEffect(
    () => observeRestTimer.execute({ next: setTimer, error: () => setTimer(null) }),
    [observeRestTimer],
  );

  const rest =
    overview === null
      ? null
      : restViewOf(timer?.endsAt ?? null, {
          exercises: overview.exercises,
          level: overview.level,
          effortMode: overview.effortMode,
          extraOf,
        });
  const message = rest?.message ?? null;

  // A set is logged before the screen sees it: the rest starts with the text of the previous
  // render (or a provisional one), and is scheduled again here once the text names the next set.
  const body = message?.body ?? null;
  const latestBody = useRef(body);
  useEffect(() => {
    latestBody.current = body;
    if (body !== null) void rescheduleRest.execute({ title: text.restNotification.title, body });
  }, [body, rescheduleRest]);

  // Back from the settings: the notice of S09, and a notice that now can be scheduled.
  useEffect(() => {
    const refresh = () => void readRestPermissions.execute().then(setNotice);
    refresh();
    const subscription = AppState.addEventListener('change', (status) => {
      if (status !== 'active') return;
      refresh();
      const current = latestBody.current;
      if (current !== null) {
        void rescheduleRest.execute({ title: text.restNotification.title, body: current });
      }
    });
    return () => subscription.remove();
  }, [readRestPermissions, rescheduleRest]);

  const seconds = () => (rest ? rest.totalSeconds : 0);

  /** D05 «Permitir», or the system prompt alone on iOS: then D17 or the notice. */
  async function allowNotifications() {
    const next = await askRestPermission.allow();
    setDialog(next === 'exactAlarms' ? 'exactAlarms' : null);
    setNotice(await readRestPermissions.execute());
  }

  return {
    rest,
    restMinimized,
    dialog,
    notice,
    async onLogged({ isWarmup, restSeconds }) {
      if (isWarmup) return;
      setRestMinimized(false);
      await startRest.execute(restSeconds, message ?? PROVISIONAL);
      const ask = await askRestPermission.firstAsk();
      if (ask === 'explain') setDialog('notifications');
      else if (ask === 'system') await allowNotifications();
    },
    actions: {
      addRest: () => addRestTime.execute(message ?? PROVISIONAL),
      restartRest: () => startRest.execute(seconds(), message ?? PROVISIONAL),
      skipRest: () => skipRest.execute(),
      minimizeRest: () => setRestMinimized(true),
      expandRest: () => setRestMinimized(false),
      allowNotifications,

      async dismissDialog() {
        if (dialog === 'notifications') await askRestPermission.dismiss();
        setDialog(null);
        // «Ahora no» leaves them off: the notice says so right away (AC7).
        setNotice(await readRestPermissions.execute());
      },
      async openExactAlarmSettings() {
        setDialog(null);
        await askRestPermission.openExactAlarmSettings();
      },
      async openNotice() {
        if (notice === 'exactAlarms') return askRestPermission.openExactAlarmSettings();
        if (notice !== 'notifications') return;
        // The system prompt while it still shows (#190): iOS settings have no notifications row for
        // an app that never asked. A refused permission only changes in settings.
        const next = await askRestPermission.allow();
        const missing = await readRestPermissions.execute();
        setNotice(missing);
        if (missing === 'notifications') await askRestPermission.openNotificationSettings();
        else if (next === 'exactAlarms') setDialog('exactAlarms');
      },
    },
  };
}
