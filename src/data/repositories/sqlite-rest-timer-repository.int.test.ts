import { openTestDatabase, type TestDatabase } from '@/data/db/open-test-database';
import { appState } from '@/data/db/schema';
import { ManualTableChanges } from '@/data/db/table-changes';
import { SqliteRestTimerRepository } from '@/data/repositories/sqlite-rest-timer-repository';
import type { RestTimer } from '@/domain/models/rest-timer';

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
const END = new Date('2026-10-13T18:02:00Z');

let t: TestDatabase;
let changes: ManualTableChanges;
let repository: SqliteRestTimerRepository;

beforeEach(() => {
  t = openTestDatabase();
  changes = new ManualTableChanges();
  repository = new SqliteRestTimerRepository(() => t.db, changes);
});

afterEach(() => {
  t.sqlite.close();
});

describe('SqliteRestTimerRepository', () => {
  it('without the app_state row: no rest and D05 never shown', async () => {
    expect(await repository.get()).toEqual({ endsAt: null, notificationPermissionAsked: false });
  });

  it('RN-ENT-07: saves the absolute end and emits it again on a change of app_state', async () => {
    const values: RestTimer[] = [];
    repository.observe({ next: (value) => values.push(value), error: jest.fn() });

    await repository.saveEndsAt(END);
    changes.emit('app_state');
    await flush();

    expect(values.at(-1)).toEqual({ endsAt: END, notificationPermissionAsked: false });
    await repository.saveEndsAt(null);
    expect((await repository.get()).endsAt).toBeNull();
  });

  it('keeps the rest of app_state, and remembers that D05 was shown', async () => {
    t.db.insert(appState).values({ owner: 'u1', onboardingStep: 2 }).run();

    await repository.saveEndsAt(END);
    await repository.markNotificationPermissionAsked();

    expect(await repository.get()).toEqual({ endsAt: END, notificationPermissionAsked: true });
    expect(t.db.select().from(appState).get()).toMatchObject({ owner: 'u1', onboardingStep: 2 });
  });
});
