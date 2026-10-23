import type { RestCountdown } from '@/domain/repositories/rest-countdown';

import { RestCountdownNotification } from '../../../modules/rest-countdown';

/**
 * The countdown on the lock screen as an ongoing notification (#305); where the module isn't
 * built in, nothing. A failure is swallowed: the countdown on screen doesn't depend on it, and a
 * set must never fail because of it.
 */
export class NotificationRestCountdown implements RestCountdown {
  /** `channelName` is what Android shows in the notification settings. */
  constructor(
    private readonly title: string,
    private readonly channelName: string,
  ) {}

  async show(endsAt: Date, next: string): Promise<void> {
    try {
      RestCountdownNotification.show(endsAt.getTime(), this.title, next, this.channelName);
    } catch {
      // The countdown on screen still works.
    }
  }

  async hide(): Promise<void> {
    try {
      RestCountdownNotification.hide();
    } catch {
      // Nothing to hide.
    }
  }
}
