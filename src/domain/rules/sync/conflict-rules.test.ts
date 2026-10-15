import { adoptsServerRow, pullAction } from '@/domain/rules/sync/conflict-rules';

const T = 1_760_000_000_000;
const live = (updatedAt: number, dirty = false) => ({ updatedAt, deletedAt: null, dirty });
const deleted = (updatedAt: number, dirty = false) => ({ updatedAt, deletedAt: updatedAt, dirty });

describe('pullAction (07 §4.1)', () => {
  it('RN-SYNC-15: a remote row that does not exist locally is written, a tombstone too', () => {
    expect(pullAction(null, live(T))).toBe('write');
    expect(pullAction(null, deleted(T))).toBe('write');
  });

  it('RF-SYNC-05.AC2: a remote delete wins over a newer pending edit (RN-SYNC-04)', () => {
    expect(pullAction(live(T + 60_000, true), deleted(T))).toBe('write');
  });

  it('RN-SYNC-15: a local delete never comes back to life, whatever the remote updated_at', () => {
    expect(pullAction(deleted(T, true), live(T + 60_000))).toBe('keep');
    expect(pullAction(deleted(T), live(T + 60_000))).toBe('keep');
  });

  it('RN-SYNC-03: a pending local edit newer than the remote is kept for the next push', () => {
    expect(pullAction(live(T + 1, true), live(T))).toBe('keep');
  });

  it('RN-SYNC-03: on a tie the server wins, and an older pending edit loses', () => {
    expect(pullAction(live(T, true), live(T))).toBe('write');
    expect(pullAction(live(T - 1, true), live(T))).toBe('write');
  });

  it('RF-SYNC-04.AC1: a row without pending changes takes the remote version', () => {
    expect(pullAction(live(T + 60_000), live(T))).toBe('write');
  });
});

describe('adoptsServerRow (07 §3, RF-SYNC-01.AC9)', () => {
  it('adopts the row the server returned when the local one did not change in flight', () => {
    expect(adoptsServerRow(T, { updatedAt: T })).toBe(true);
  });

  it('keeps a row edited while the push was in flight: it goes in the next push', () => {
    expect(adoptsServerRow(T, { updatedAt: T + 1 })).toBe(false);
  });

  it('does not bring back a row that is gone from the device', () => {
    expect(adoptsServerRow(T, null)).toBe(false);
  });
});
