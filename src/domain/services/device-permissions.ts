/** The notification permission as the system reports it. */
export type NotificationPermission = 'granted' | 'denied' | 'undetermined';

/** The permissions the rest notification needs (RF-ENT-06.AC9, AC10). */
export interface DevicePermissions {
  /**
   * D05 explains before the system prompt (Android, where D17 may follow). Where the prompt says
   * it all and a second one in a row only confuses (iOS), it comes alone (#191).
   */
  readonly explainsFirst: boolean;
  notifications(): Promise<NotificationPermission>;
  /** Shows the system prompt; true when granted. */
  requestNotifications(): Promise<boolean>;
  /** Android 12+: «Alarmas y recordatorios». Always true where it doesn't apply. */
  canScheduleExactAlarms(): Promise<boolean>;
  openNotificationSettings(): Promise<void>;
  openExactAlarmSettings(): Promise<void>;
}
