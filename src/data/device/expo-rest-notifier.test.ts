import * as Notifications from 'expo-notifications';

import {
  ExpoRestNotifier,
  REST_NOTIFICATION_ID,
  silenceRestNoticeInForeground,
} from '@/data/device/expo-rest-notifier';

jest.mock('expo-notifications', () => ({
  AndroidImportance: { MAX: 5 },
  SchedulableTriggerInputTypes: { DATE: 'date' },
  setNotificationChannelAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  dismissNotificationAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
}));

const AT = new Date('2026-10-13T18:02:00Z');
const MESSAGE = { title: '¡Descanso terminado!', body: 'Siguiente: Sentadilla · 100 kg × 8' };

describe('ExpoRestNotifier (RN-ENT-07, spike #14)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('schedules for the absolute end, always with the fixed id, on the rest channel', async () => {
    await new ExpoRestNotifier('Descanso').schedule(AT, MESSAGE);

    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
      identifier: REST_NOTIFICATION_ID,
      content: { ...MESSAGE, sound: true },
      trigger: { type: 'date', date: AT, channelId: 'rest-timer' },
    });
    expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith(
      'rest-timer',
      expect.objectContaining({ name: 'Descanso', importance: 5 }),
    );
  });

  it('cancel removes the scheduled one and one already shown', async () => {
    await new ExpoRestNotifier('Descanso').cancel();

    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('rest-timer');
    expect(Notifications.dismissNotificationAsync).toHaveBeenCalledWith('rest-timer');
  });

  it('a failure of the system never breaks the workout: the notice on screen still works', async () => {
    jest.mocked(Notifications.scheduleNotificationAsync).mockRejectedValueOnce(new Error('os'));

    await expect(new ExpoRestNotifier('Descanso').schedule(AT, MESSAGE)).resolves.toBeUndefined();
  });

  it('RF-ENT-06.AC6: with the app open the screen and the vibration give the notice, not a banner', async () => {
    silenceRestNoticeInForeground();
    const { handleNotification } = jest.mocked(Notifications.setNotificationHandler).mock
      .calls[0][0]!;

    expect(await handleNotification({} as never)).toEqual({
      shouldShowBanner: false,
      shouldShowList: false,
      shouldPlaySound: false,
      shouldSetBadge: false,
    });
  });
});
