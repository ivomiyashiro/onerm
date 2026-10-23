import type { RestCountdown } from '@/domain/repositories/rest-countdown';

/** What the Live Activity shows (see `rest-live-activity.tsx`); dates as epoch ms. */
interface RestActivityProps {
  title: string;
  finished: string;
  next: string;
  startsAt: number;
  endsAt: number;
}

interface RestActivity {
  update(props: RestActivityProps, staleDate?: Date): Promise<void>;
  end(dismissal: 'immediate'): Promise<void>;
}

/** The part of the `LiveActivityFactory` of expo-widgets this adapter uses. */
export interface RestActivities {
  start(props: RestActivityProps, url?: string, staleDate?: Date): RestActivity;
  getInstances(): RestActivity[];
}

/**
 * The countdown on the iPhone lock screen and in the Dynamic Island as a Live Activity (#305).
 * It stays active, so the next rest updates it, and goes stale at the end of the rest: then it
 * says the rest ended without the app running. A failure (Live Activities turned off) is
 * swallowed: the countdown on screen doesn't depend on it.
 */
export class LiveActivityRestCountdown implements RestCountdown {
  private queue: Promise<void> = Promise.resolve();

  constructor(
    private readonly activities: RestActivities,
    private readonly text: { title: string; finished: string },
    private readonly now: () => Date,
  ) {}

  show(endsAt: Date, next: string): Promise<void> {
    return this.inTurn(async () => {
      const props = {
        ...this.text,
        next,
        // Only the end matters to a countdown; the range just needs to start before it.
        startsAt: this.now().getTime(),
        endsAt: endsAt.getTime(),
      };
      // Also the one a previous run of the app left.
      const [current] = this.activities.getInstances();
      if (current) await current.update(props, endsAt);
      else this.activities.start(props, undefined, endsAt);
    });
  }

  hide(): Promise<void> {
    return this.inTurn(async () => {
      await Promise.all(
        this.activities.getInstances().map((activity) => activity.end('immediate')),
      );
    });
  }

  /**
   * One change at a time: the start of a rest and the text of its next set arrive together, and
   * interleaved they would start two activities. A failure is swallowed.
   */
  private inTurn(change: () => Promise<void>): Promise<void> {
    this.queue = this.queue.then(change).catch(() => {});
    return this.queue;
  }
}
