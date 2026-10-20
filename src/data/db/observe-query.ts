import { getTableName } from 'drizzle-orm';
import type { SQLiteTable } from 'drizzle-orm/sqlite-core';

import type { Observer, Unsubscribe } from '@/domain/repositories/observer';

import { sameValue } from './same-value';
import type { TableChanges } from './table-changes';

/**
 * The reactive read behind every `observe…()` (ADR-0010, ADR-0011 §3): runs `query` on subscribe
 * and again after a change in any of `tables`. expo-sqlite notifies once per changed row, so the
 * notifications of a write are batched into one re-run (a microtask later), and a result with the
 * same data as the last one isn't emitted (#230): a write the query doesn't see renders nothing.
 * After an error the observation ends, as the `Observer` contract says.
 */
export function observeQuery<T>(
  changes: TableChanges,
  tables: readonly SQLiteTable[],
  query: () => T,
  observer: Observer<T>,
): Unsubscribe {
  const names = new Set(tables.map((table) => getTableName(table)));
  let active = true;
  let scheduled = false;
  let last: { value: T } | null = null;

  const run = () => {
    if (!active) return;
    let value: T;
    try {
      value = query();
    } catch (error) {
      stop();
      observer.error(error);
      return;
    }
    if (last !== null && sameValue(last.value, value)) return;
    last = { value };
    observer.next(value);
  };

  const unsubscribe = changes.subscribe((tableName) => {
    if (!active || scheduled || !names.has(tableName)) return;
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      run();
    });
  });

  function stop() {
    if (!active) return;
    active = false;
    unsubscribe();
  }

  run();
  return stop;
}
