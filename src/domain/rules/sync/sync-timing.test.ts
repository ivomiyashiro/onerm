import {
  isOlderVersion,
  pullStart,
  retryDelayMs,
  serverTimeMs,
} from '@/domain/rules/sync/sync-timing';

describe('retryDelayMs (07 §4.1, RNF-22)', () => {
  it('backs off 5 s, 15 s and 60 s, and then stays at 5 min', () => {
    expect([1, 2, 3, 4, 9].map(retryDelayMs)).toEqual([5_000, 15_000, 60_000, 300_000, 300_000]);
  });
});

describe('serverTimeMs', () => {
  it('reads a timestamptz with microseconds as the server returns it (spike #13)', () => {
    expect(serverTimeMs('2026-10-15T12:00:00.123456+00:00')).toBe(
      Date.UTC(2026, 9, 15, 12, 0, 0, 123),
    );
  });

  it('reads one without fraction or in another offset', () => {
    expect(serverTimeMs('2026-10-15T09:00:00-03:00')).toBe(Date.UTC(2026, 9, 15, 12));
  });
});

describe('pullStart (RN-SYNC-07, 07 §4.1)', () => {
  it('a table never pulled starts from the beginning', () => {
    expect(pullStart(null)).toBeNull();
  });

  it('starts 5 s before the cursor and from the smallest id: the overlap of ADR-0002 R2', () => {
    expect(pullStart({ ts: '2026-10-15T12:00:05.123456+00:00', id: 'f3c1…' })).toEqual({
      ts: '2026-10-15T12:00:00.123Z',
      id: '00000000-0000-0000-0000-000000000000',
    });
  });
});

describe('isOlderVersion (RN-SYNC-14)', () => {
  it('compares each part as a number', () => {
    expect(isOlderVersion('0.9.0', '0.10.0')).toBe(true);
    expect(isOlderVersion('1.2.0', '1.1.9')).toBe(false);
  });

  it('the same version is not older', () => {
    expect(isOlderVersion('0.1.0', '0.1.0')).toBe(false);
  });
});
