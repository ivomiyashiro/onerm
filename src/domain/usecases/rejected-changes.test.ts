import type { RejectedChange } from '@/domain/models/rejected-change';
import { RetryRejectedChange } from '@/domain/usecases/rejected-changes';

const CHANGE: RejectedChange = {
  kind: 'routine',
  id: 'r1',
  reason: '23514',
  name: 'Fuerza',
  uploadedBefore: false,
  dependents: 0,
};

describe('RetryRejectedChange (RF-SYNC-06.AC4)', () => {
  it('makes the change pending again and syncs right away', async () => {
    const steps: string[] = [];
    const retry = new RetryRejectedChange(
      { retry: async () => void steps.push('pending again') },
      {
        syncNow: async () => {
          steps.push('sync');
          return 'synced';
        },
      },
    );

    await retry.execute(CHANGE);

    expect(steps).toEqual(['pending again', 'sync']);
  });
});
