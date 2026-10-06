/**
 * The PRAGMAs every connection runs right after opening: neither expo-sqlite nor better-sqlite3
 * turns them on by default, and SQLite doesn't store them in the file (spike #11). The app and
 * the integration tests share this function so both databases behave the same.
 *
 * WAL doesn't apply to an in-memory database (`journal_mode` stays `memory`), so the tests only
 * get the foreign keys; WAL is checked on the emulator.
 */
export function connectionPragmas({ inMemory }: { inMemory: boolean }): string {
  const foreignKeys = 'PRAGMA foreign_keys = ON;';
  return inMemory ? foreignKeys : `PRAGMA journal_mode = WAL; ${foreignKeys}`;
}
