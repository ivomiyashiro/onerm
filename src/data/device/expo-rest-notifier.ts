import * as Notifications from 'expo-notifications';

import type { RestMessage } from '@/domain/models/rest-timer';
import type { RestNotifier } from '@/domain/repositories/rest-notifier';

/** Fixed: scheduling again replaces the notice, and cancelling leaves none (spike #14). */
export const REST_NOTIFICATION_ID = 'rest-timer';
const CHANNEL_ID = 'rest-timer';
const VIBRATION_MS = [0, 400, 200, 400];

/**
 * The notice at the end of the rest (RN-ENT-07): a local notification the system fires at the
 * absolute end, with no process in the background (RNF-22). A failure is swallowed: the
 * countdown on screen doesn't depend on it, and a set must never fail because of it.
 */
export class ExpoRestNotifier implements RestNotifier {
  /** `channelName` is what Android shows in the notification settings. */
  constructor(private readonly channelName: string) {}

  async schedule(at: Date, message: RestMessage): Promise<void> {
    try {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: this.channelName,
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: VIBRATION_MS,
      });
      await Notifications.scheduleNotificationAsync({
        identifier: REST_NOTIFICATION_ID,
        content: { ...message, sound: true },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: at,
          channelId: CHANNEL_ID,
        },
      });
    } catch {
      // The notice on screen still works (RF-ENT-06.AC6).
    }
  }

  async cancel(): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(REST_NOTIFICATION_ID);
      await Notifications.dismissNotificationAsync(REST_NOTIFICATION_ID);
    } catch {
      // Nothing was scheduled.
    }
  }
}

/**
 * RF-ENT-06.AC6: in the foreground the screen says the rest ended and the app vibrates; the
 * notification would repeat it. Set once, when the app starts.
 */
export function silenceRestNoticeInForeground(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: false,
      shouldShowList: false,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}
