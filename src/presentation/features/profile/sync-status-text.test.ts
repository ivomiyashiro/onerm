import { syncStatusText } from '@/presentation/features/profile/sync-status-text';

const NOW = new Date('2026-10-15T12:00:00Z');
const ago = (ms: number) => new Date(NOW.getTime() - ms);
const synced = (lastSyncedAt: Date) => ({ kind: 'synced', lastSyncedAt }) as const;

describe('syncStatusText (RF-SYNC-06, 13 §9)', () => {
  it('«Respaldado · hace {tiempo}», in the largest whole unit', () => {
    expect(syncStatusText(synced(ago(20_000)), NOW)).toBe('Respaldado · hace menos de 1 min');
    expect(syncStatusText(synced(ago(2 * 60_000)), NOW)).toBe('Respaldado · hace 2 min');
    expect(syncStatusText(synced(ago(3 * 3_600_000)), NOW)).toBe('Respaldado · hace 3 h');
    expect(syncStatusText(synced(ago(26 * 3_600_000)), NOW)).toBe('Respaldado · hace 1 día');
  });

  it('the counts use the singular with 1 (13 §1)', () => {
    expect(syncStatusText({ kind: 'pending', count: 1, online: false }, NOW)).toBe(
      '1 cambio sin respaldar · sin conexión',
    );
    expect(syncStatusText({ kind: 'conflict', count: 2 }, NOW)).toBe(
      '2 cambios no se pudieron respaldar',
    );
  });
});
