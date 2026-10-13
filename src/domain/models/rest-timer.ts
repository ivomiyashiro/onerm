/** The rest timer and its permission flag, local to this device (07 §2.4, RN-ENT-07). */
export interface RestTimer {
  /** The absolute end of the rest; null when no rest is running. */
  readonly endsAt: Date | null;
  /** D05 was already shown once (RF-ENT-06.AC9). */
  readonly notificationPermissionAsked: boolean;
}

/** What the notification at the end of the rest says. */
export interface RestMessage {
  readonly title: string;
  readonly body: string;
}
