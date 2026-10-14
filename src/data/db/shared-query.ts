import { getTableName } from 'drizzle-orm';
import type { SQLiteTable } from 'drizzle-orm/sqlite-core';

import type { Observer, Unsubscribe } from '@/domain/repositories/observer';

import type { TableChanges } from './table-changes';

/**
 * Like `observeQuery`, but one read shared by every observer, kept while any is subscribed (#141).
 * A change in `tables` first computes `fingerprint`, a cheap query over the rows `query` reads; only
 * when it differs does it read again and tell the observers. So a write the query doesn't see (a
 * set of the workout in progress, for the finished history) costs one small query and wakes
 * nobody. Writes from anywhere count, the sync pull included, because the fingerprint is read
 * from the database. After an error every observation ends, as the `Observer` contract says.
 */
export function sharedQuery<T>(
  changes: TableChanges,
  tables: readonly SQLiteTable[],
  fingerprint: () => string,
  query: () => T,
): (observer: Observer<T>) => Unsubscribe {
  const names = new Set(tables.map((table) => getTableName(table)));
  const observers = new Set<Observer<T>>();
  let current: { fingerprint: string; value: T } | null = null;
  let unsubscribe: Unsubscribe | null = null;
  let scheduled = false;

  const read = () => ({ fingerprint: fingerprint(), value: query() });

  function fail(error: unknown) {
    const failed = [...observers];
    reset();
    failed.forEach((observer) => observer.error(error));
  }

  function reset() {
    observers.clear();
    current = null;
    unsubscribe?.();
    unsubscribe = null;
  }

  function refresh() {
    if (current === null) return;
    try {
      if (fingerprint() === current.fingerprint) return;
      current = read();
    } catch (error) {
      fail(error);
      return;
    }
    const { value } = current;
    observers.forEach((observer) => observer.next(value));
  }

  return (observer) => {
    if (current === null) {
      try {
        current = read();
      } catch (error) {
        observer.error(error);
        return () => {};
      }
      unsubscribe = changes.subscribe((tableName) => {
        if (scheduled || !names.has(tableName)) return;
        scheduled = true;
        // expo-sqlite notifies once per changed row: one check per write.
        queueMicrotask(() => {
          scheduled = false;
          refresh();
        });
      });
    }
    observers.add(observer);
    observer.next(current.value);
    return () => {
      if (!observers.delete(observer)) return;
      if (observers.size === 0) reset();
    };
  };
}
