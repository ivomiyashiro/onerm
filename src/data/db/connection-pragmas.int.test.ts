import Database from 'better-sqlite3';

import { connectionPragmas } from './connection-pragmas';

describe('connectionPragmas on a real SQLite database', () => {
  it('turns the foreign keys on (expo-sqlite opens with them off, spike #11)', () => {
    const sqlite = new Database(':memory:');
    // better-sqlite3 is built with them on: turn them off to start like expo-sqlite.
    sqlite.pragma('foreign_keys = OFF');

    sqlite.exec(connectionPragmas({ inMemory: true }));

    expect(sqlite.pragma('foreign_keys', { simple: true })).toBe(1);
  });
});
