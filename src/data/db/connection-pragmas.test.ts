import { connectionPragmas } from './connection-pragmas';

describe('connectionPragmas', () => {
  it('turns on WAL and the foreign keys for the database file (ADR-0010)', () => {
    expect(connectionPragmas({ inMemory: false })).toBe(
      'PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;',
    );
  });

  it('leaves WAL out in memory, where it does not apply (spike #11)', () => {
    expect(connectionPragmas({ inMemory: true })).toBe('PRAGMA foreign_keys = ON;');
  });
});
