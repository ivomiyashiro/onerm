import { requireOptionalNativeModule } from 'expo';

interface ExactAlarmModule {
  canScheduleExactAlarms(): boolean;
  openSettings(): void;
}

/**
 * The local module of `modules/exact-alarm` (spike #14). Where it isn't built in (tests in Node,
 * web), exact alarms don't apply.
 */
export const ExactAlarm: ExactAlarmModule = requireOptionalNativeModule<ExactAlarmModule>(
  'ExactAlarm',
) ?? { canScheduleExactAlarms: () => true, openSettings: () => {} };
