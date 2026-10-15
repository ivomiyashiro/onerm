import { render } from '@testing-library/react-native';

import type { SyncTriggerListener } from '@/domain/repositories/sync-triggers';
import { KeepBackedUp } from '@/domain/usecases/keep-backed-up';
import { SyncScheduler } from '@/domain/usecases/sync-scheduler';
import { SyncWatcher } from '@/presentation/features/sync/sync-watcher';
import { someUseCases } from '@/presentation/use-cases/testing';
import { UseCasesProvider } from '@/presentation/use-cases/use-cases-context';

describe('SyncWatcher (RF-SYNC-01)', () => {
  it('keeps the backup running while it is mounted, and stops it when it goes', async () => {
    let runs = 0;
    let listener: SyncTriggerListener | null = null;
    const scheduler = new SyncScheduler(
      {
        sync: async () => {
          runs++;
          return 'synced';
        },
      },
      async () => 0,
    );
    const keepBackedUp = new KeepBackedUp(scheduler, {
      subscribe: (next) => {
        listener = next;
        return () => (listener = null);
      },
    });

    const view = await render(
      <UseCasesProvider useCases={someUseCases({ keepBackedUp })}>
        <SyncWatcher />
      </UseCasesProvider>,
    );
    expect(runs).toBe(1);
    expect(listener).not.toBeNull();

    await view.unmount();
    expect(listener).toBeNull();
  });
});
