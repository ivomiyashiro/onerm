import * as Notifications from 'expo-notifications';
import { Linking } from 'react-native';

import { ExpoDevicePermissions } from '@/data/device/expo-device-permissions';
import { ExactAlarm } from '../../../modules/exact-alarm';

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
}));
jest.mock('../../../modules/exact-alarm', () => ({
  ExactAlarm: { canScheduleExactAlarms: jest.fn(), openSettings: jest.fn() },
}));

const permissions = new ExpoDevicePermissions();

describe('ExpoDevicePermissions (RF-ENT-06.AC9, AC10)', () => {
  it('reads the notification permission as the system reports it', async () => {
    jest
      .mocked(Notifications.getPermissionsAsync)
      .mockResolvedValue({ status: 'denied', canAskAgain: false } as never);

    expect(await permissions.notifications()).toBe('denied');
  });

  it('Android 13+: «denied» while the system can still ask means not asked yet', async () => {
    jest
      .mocked(Notifications.getPermissionsAsync)
      .mockResolvedValue({ status: 'denied', canAskAgain: true } as never);

    expect(await permissions.notifications()).toBe('undetermined');
  });

  it('asks the system and says whether it was granted', async () => {
    jest
      .mocked(Notifications.requestPermissionsAsync)
      .mockResolvedValue({ granted: true } as never);

    expect(await permissions.requestNotifications()).toBe(true);
  });

  it('exact alarms come from the local module, which also opens their settings (D17)', async () => {
    jest.mocked(ExactAlarm.canScheduleExactAlarms).mockReturnValue(false);

    expect(await permissions.canScheduleExactAlarms()).toBe(false);
    await permissions.openExactAlarmSettings();
    expect(ExactAlarm.openSettings).toHaveBeenCalled();
  });

  it('«Activar» opens the settings of the app', async () => {
    const open = jest.spyOn(Linking, 'openSettings').mockResolvedValue();

    await permissions.openNotificationSettings();

    expect(open).toHaveBeenCalled();
  });
});
