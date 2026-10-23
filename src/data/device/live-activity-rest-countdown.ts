import type { RestCountdown } from '@/domain/repositories/rest-countdown';

/** What the Live Activity shows (see `rest-live-activity.tsx`); dates as epoch ms. */
interface RestActivityProps {
  title: string;
  next: string;
  startsAt: number;
  endsAt: number;
}

type Dismissal = 'immediate' | { after: Date };

interface RestActivity {
  end(dismissal: Dismissal): Promise<void>;
}

/** The part of the `LiveActivityFactory` of expo-widgets this adapter uses. */
export interface RestActivities {
  start(props: RestActivityProps): RestActivity;
  getInstances(): RestActivity[];
}

/**
 * The countdown on the iPhone lock screen as a Live Activity (#305). It is ended as soon as it
 * starts, with the system removing it at the end of the rest: that way it goes away even if the
 * app never runs again. An ended activity takes no updates, so moving the end replaces it. A
 * failure (Live Activities turned off) is swallowed: the countdown on screen doesn't depend on it.
 */
export class LiveActivityRestCountdown implements RestCountdown {
  constructor(
    private readonly activities: RestActivities,
    private readonly title: string,
    private readonly now: () => Date,
  ) {}

  async show(endsAt: Date, next: string): Promise<void> {
    try {
      await this.removeAll();
      const startsAt = this.now().getTime();
      const activity = this.activities.start({
        title: this.title,
        next,
        startsAt,
        endsAt: endsAt.getTime(),
      });
      await activity.end({ after: endsAt });
    } catch {
      // The countdown on screen still works.
    }
  }

  async hide(): Promise<void> {
    try {
      await this.removeAll();
    } catch {
      // Nothing to hide.
    }
  }

  private async removeAll(): Promise<void> {
    await Promise.all(this.activities.getInstances().map((activity) => activity.end('immediate')));
  }
}
