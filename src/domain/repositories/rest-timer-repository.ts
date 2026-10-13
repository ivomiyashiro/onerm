import type { RestTimer } from '@/domain/models/rest-timer';
import type { Observer, Unsubscribe } from '@/domain/repositories/observer';

/** The rest timer in the single row of `app_state` (07 §2.4). */
export interface RestTimerRepository {
  observe(observer: Observer<RestTimer>): Unsubscribe;
  get(): Promise<RestTimer>;
  saveEndsAt(endsAt: Date | null): Promise<void>;
  markNotificationPermissionAsked(): Promise<void>;
}
