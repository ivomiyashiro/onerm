/** The notification permission as the system reports it. */
export type NotificationPermission = 'granted' | 'denied' | 'undetermined';

/** The permissions the rest notification needs (RF-ENT-06.AC9, AC10). */
export interface DevicePermissions {
  notifications(): Promise<NotificationPermission>;
  /** Shows the system prompt; true when granted. */
  requestNotifications(): Promise<boolean>;
  /** Android 12+: «Alarmas y recordatorios». Always true where it doesn't apply. */
  canScheduleExactAlarms(): Promise<boolean>;
  openNotificationSettings(): Promise<void>;
  openExactAlarmSettings(): Promise<void>;
}
