import type { Unsubscribe } from '@/domain/repositories/observer';

/**
 * Tells when a table of the local database changed, so `observe…()` can read again (spike #11).
 * The app listens to expo-sqlite's change events (`expoTableChanges`); the integration tests use
 * `ManualTableChanges`, because better-sqlite3 has no such events.
 */
export interface TableChanges {
  subscribe(listener: (tableName: string) => void): Unsubscribe;
}

/** A change source the test drives by hand: `emit('routines')` plays a write to that table. */
export class ManualTableChanges implements TableChanges {
  private readonly listeners = new Set<(tableName: string) => void>();

  subscribe(listener: (tableName: string) => void): Unsubscribe {
    // A wrapper, so subscribing the same function twice gives two independent subscriptions.
    const entry = (tableName: string) => listener(tableName);
    this.listeners.add(entry);
    return () => {
      this.listeners.delete(entry);
    };
  }

  emit(tableName: string): void {
    this.listeners.forEach((listener) => listener(tableName));
  }

  listenerCount(): number {
    return this.listeners.size;
  }
}
