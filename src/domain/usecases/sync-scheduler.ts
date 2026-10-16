import type { Unsubscribe } from '@/domain/repositories/observer';
import type { SyncEngine, SyncResult } from '@/domain/repositories/sync-engine';
import { retryDelayMs } from '@/domain/rules/sync/sync-timing';

/** What the backup status needs from the scheduler (RF-SYNC-06). */
export interface SyncActivity {
  running: boolean;
  /** How the last sync ended; null before the first one. */
  lastResult: SyncResult | null;
  /** The connection the device reported; null until it does. */
  online: boolean | null;
}

/** RN-SYNC-06 (a): how long after a local write the push goes, grouping the writes around it. */
const WRITE_GROUPING_MS = 3_000;

/**
 * Decides when the sync runs (RN-SYNC-06): 3 s after a local write, at once on the other triggers
 * (opening the app, the foreground, getting the connection back, by hand). Never two at a time: a
 * trigger during a sync runs it again once at the end (07 §4.1). After a failure it retries with
 * backoff, only in the foreground and while there are pending changes; nothing polls (RNF-22).
 */
export class SyncScheduler {
  private running: Promise<SyncResult> | null = null;
  /** The run that starts when the current one ends, shared by everyone who asked meanwhile. */
  private queued: Promise<SyncResult> | null = null;
  private writeTimer: ReturnType<typeof setTimeout> | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private failures = 0;
  /** False in the background or once stopped: nothing waits to run, a trigger brings it back. */
  private active = true;
  private activity: SyncActivity = { running: false, lastResult: null, online: null };
  private readonly activityListeners = new Set<(activity: SyncActivity) => void>();

  constructor(
    private readonly engine: SyncEngine,
    /** The changes waiting to go up (RN-SYNC-08). */
    private readonly countPending: () => Promise<number>,
  ) {}

  /**
   * RN-SYNC-06 (a). It syncs only if something is left to upload: the sync's own writes and the
   * sets of a workout in progress (RN-SYNC-13) also change the tables, and must not trigger it.
   */
  afterWrite(): void {
    if (!this.active) return;
    this.clear('write');
    this.writeTimer = setTimeout(() => {
      this.writeTimer = null;
      void this.countPending().then(
        (count) => {
          if (count > 0) void this.syncNow();
        },
        // The count failed to read: no sync now, the next trigger tries again.
        () => undefined,
      );
    }, WRITE_GROUPING_MS);
  }

  /** RN-SYNC-06 (b). In the background it waits for the next foreground (RNF-22). */
  afterReconnect(): void {
    this.setActivity({ online: true });
    if (this.active) void this.syncNow();
  }

  disconnected(): void {
    this.setActivity({ online: false });
  }

  /** The current activity at once, and then each change. */
  observeActivity(listener: (activity: SyncActivity) => void): Unsubscribe {
    this.activityListeners.add(listener);
    listener(this.activity);
    return () => {
      this.activityListeners.delete(listener);
    };
  }

  /** RN-SYNC-06 (c) and (d), and signing out. Resolves with the result of a run that started after asking. */
  syncNow(): Promise<SyncResult> {
    if (this.running !== null) {
      this.queued ??= this.running.then(() => {
        this.queued = null;
        return this.syncNow();
      });
      return this.queued;
    }
    this.clear('retry');
    this.running = this.run().finally(() => {
      this.running = null;
    });
    return this.running;
  }

  /** RN-SYNC-06 (c). */
  enterForeground(): void {
    this.active = true;
    void this.syncNow();
  }

  /** RNF-22: in the background nothing waits to run; the next foreground syncs. */
  enterBackground(): void {
    this.stop();
  }

  /**
   * Cancels what is waiting, and a sync in flight that fails leaves no retry behind. `syncNow`
   * still runs when asked (signing out backs up first).
   */
  stop(): void {
    this.active = false;
    this.clear('write');
    this.clear('retry');
  }

  private async run(): Promise<SyncResult> {
    let result: SyncResult;
    this.setActivity({ running: true });
    try {
      result = await this.engine.sync();
    } catch {
      result = 'failed';
    }
    this.setActivity({ running: false, lastResult: result });
    if (result === 'failed') {
      this.failures++;
      await this.scheduleRetry();
    } else {
      this.failures = 0;
    }
    return result;
  }

  private async scheduleRetry(): Promise<void> {
    const pending = await this.countPending().catch(() => 0);
    if (!this.active || pending === 0) return;
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      void this.syncNow();
    }, retryDelayMs(this.failures));
  }

  private setActivity(change: Partial<SyncActivity>): void {
    this.activity = { ...this.activity, ...change };
    this.activityListeners.forEach((listener) => listener(this.activity));
  }

  private clear(timer: 'write' | 'retry'): void {
    const handle = timer === 'write' ? this.writeTimer : this.retryTimer;
    if (handle !== null) clearTimeout(handle);
    if (timer === 'write') this.writeTimer = null;
    else this.retryTimer = null;
  }
}
