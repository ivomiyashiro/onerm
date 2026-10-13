import * as Notifications from 'expo-notifications';
import { Linking } from 'react-native';

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
  async notifications(): Promise<NotificationPermission> {
    const { status } = await Notifications.getPermissionsAsync();
    return status;
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
