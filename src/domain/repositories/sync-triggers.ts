import type { Unsubscribe } from '@/domain/repositories/observer';

/** The device events that start a sync (RN-SYNC-06). */
export interface SyncTriggerListener {
  /** (a) A write to a user table of the local database. */
  localWrite(): void;
  /** (c) The app came back to the foreground. */
  foreground(): void;
  /** The app went to the background: nothing should wait to run (RNF-22). */
  background(): void;
  /** (b) The device got its connection back. */
  reconnected(): void;
}

/** Where the triggers come from: the local database, the app's state and the network. */
export interface SyncTriggers {
  subscribe(listener: SyncTriggerListener): Unsubscribe;
}
