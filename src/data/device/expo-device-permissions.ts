import * as Notifications from 'expo-notifications';
import { Linking, Platform } from 'react-native';

import type {
  DevicePermissions,
  NotificationPermission,
} from '@/domain/repositories/device-permissions';
import { ExactAlarm } from '../../../modules/exact-alarm';

/**
 * The permissions of the rest notification (RF-ENT-06.AC9, AC10). A denied permission never
 * raises an error when scheduling (spike #14): it has to be read.
 */
export class ExpoDevicePermissions implements DevicePermissions {
  // iOS: its prompt can't carry our text, and the rest that just started explains it (#191).
  readonly explainsFirst = Platform.OS === 'android';

  async notifications(): Promise<NotificationPermission> {
    const { status, canAskAgain } = await Notifications.getPermissionsAsync();
    // Android 13+ reports «denied» before the first prompt; the system can still ask.
    return status === 'denied' && canAskAgain ? 'undetermined' : status;
  }

  async requestNotifications(): Promise<boolean> {
    return (await Notifications.requestPermissionsAsync()).granted;
  }

  async canScheduleExactAlarms(): Promise<boolean> {
    return ExactAlarm.canScheduleExactAlarms();
  }

  openNotificationSettings(): Promise<void> {
    return Linking.openSettings();
  }

  async openExactAlarmSettings(): Promise<void> {
    ExactAlarm.openSettings();
  }
}
