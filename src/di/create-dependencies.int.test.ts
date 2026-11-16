import { CATALOG_SNAPSHOT } from '@/data/catalog/catalog-snapshot';
import { loadCatalogSnapshot } from '@/data/catalog/load-catalog-snapshot';
import { openTestLocalDatabase } from '@/data/db/open-test-database';
import { ManualTableChanges } from '@/data/db/table-changes';
import { SyncGuestUnion } from '@/data/sync/sync-guest-union';
import { SyncRejectedChangeRepository } from '@/data/sync/sync-rejected-change-repository';
import { createDependencies } from '@/di/create-dependencies';
import {
  FakeDevicePermissions,
  FakeRestCountdown,
  FakeRestNotifier,
} from '@/domain/testing/in-memory-repositories';
import type { NextDayOverview } from '@/domain/usecases/routines/observe-next-day';
import type { RoutinesOverview } from '@/domain/usecases/routines/observe-routines';
import { firstValue } from '@/domain/usecases/shared/observe-together';
import type { SyncActivity } from '@/domain/usecases/sync/sync-scheduler';
import { UnconfiguredAuthGateway } from '@/data/auth/create-supabase-auth';

async function dependencies() {
  const localDatabase = openTestLocalDatabase((db) => loadCatalogSnapshot(db, CATALOG_SNAPSHOT));
  await localDatabase.prepare();
  let n = 0;
  return createDependencies(
    { localDatabase, changes: new ManualTableChanges() },
    () => `id-${++n}`,
    {
      notifier: new FakeRestNotifier(),
      countdown: new FakeRestCountdown(),
      permissions: new FakeDevicePermissions(),
    },
  );
}

describe('createDependencies: routines on SQLite', () => {
  it('RF-RUT-02.AC1: adopting PLT-FB3 before the onboarding makes Día A the next day', async () => {
    const { useCases } = await dependencies();

    await expect(useCases.adoptTemplate.execute('PLT-FB3')).resolves.toEqual({ status: 'done' });

    const home = await firstValue<NextDayOverview>((o) => useCases.observeNextDay.execute(o));
    expect(home).toMatchObject({
      kind: 'nextDay',
      routine: { name: 'Cuerpo completo A/B — 3 días', dayCount: 2 },
      day: { name: 'Día A' },
    });
    expect(home.kind === 'nextDay' && home.day.exercises[0].name).toBe('Prensa de piernas');
  });

  it('RF-RUT-08.AC2: deleting the active routine leaves the home without one', async () => {
    const { useCases } = await dependencies();
    await useCases.adoptTemplate.execute('PLT-FB3');

    await useCases.deleteRoutine.execute('id-1');

    const routines = await firstValue<RoutinesOverview>((o) => useCases.observeRoutines.execute(o));
    expect(routines).toMatchObject({ routines: [], activeRoutineId: null });
    const home = await firstValue<NextDayOverview>((o) => useCases.observeNextDay.execute(o));
    expect(home).toEqual({ kind: 'noActiveRoutine' });
  });
});

describe('createDependencies: one sync scheduler', () => {
  it('RF-SYNC-06: syncNow is heard by observeSyncActivity, so both share the scheduler', async () => {
    const localDatabase = openTestLocalDatabase((db) => loadCatalogSnapshot(db, CATALOG_SNAPSHOT));
    await localDatabase.prepare();
    const changes = new ManualTableChanges();
    const { useCases } = createDependencies(
      { localDatabase, changes },
      () => 'id',
      {
        notifier: new FakeRestNotifier(),
        countdown: new FakeRestCountdown(),
        permissions: new FakeDevicePermissions(),
      },
      new UnconfiguredAuthGateway(),
      {
        engine: { sync: async () => 'synced' },
        countUploadable: async () => 0,
        triggers: { subscribe: () => () => {} },
        rejected: new SyncRejectedChangeRepository(() => localDatabase.database, changes, null),
        union: new SyncGuestUnion(() => localDatabase.database, null),
      },
    );
    const activity: SyncActivity[] = [];
    const unsubscribe = useCases.observeSyncActivity.execute((a) => activity.push(a));

    await expect(useCases.syncNow.execute()).resolves.toBe('synced');

    expect(activity.at(-1)).toMatchObject({ running: false, lastResult: 'synced' });
    unsubscribe();
  });
});
