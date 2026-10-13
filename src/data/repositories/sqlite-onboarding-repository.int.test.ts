import { openTestDatabase, type TestDatabase } from '@/data/db/open-test-database';
import { appState } from '@/data/db/schema';
import { ManualTableChanges } from '@/data/db/table-changes';
import { SqliteOnboardingRepository } from '@/data/repositories/sqlite-onboarding-repository';
import type { OnboardingStep } from '@/domain/models/onboarding';

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

let t: TestDatabase;
let changes: ManualTableChanges;
let repository: SqliteOnboardingRepository;

beforeEach(() => {
  t = openTestDatabase();
  changes = new ManualTableChanges();
  repository = new SqliteOnboardingRepository(() => t.db, changes);
});

afterEach(() => {
  t.sqlite.close();
});

function observe() {
  const values: (OnboardingStep | null)[] = [];
  repository.observeStep({ next: (value) => values.push(value), error: jest.fn() });
  return () => values[values.length - 1];
}

describe('SqliteOnboardingRepository', () => {
  it('emits null while no step was saved, also without the app_state row', () => {
    expect(observe()()).toBeNull();
  });

  it('RF-PERF-01.AC6: saves the step and emits it again on a change of app_state', async () => {
    const last = observe();

    await repository.saveStep('goal');
    changes.emit('app_state');
    await flush();

    expect(last()).toBe('goal');
    expect(t.db.select().from(appState).get()?.onboardingStep).toBe(2);
  });

  it('keeps the rest of app_state, and null clears the step', async () => {
    t.db.insert(appState).values({ owner: 'u1', catalogVersion: '3' }).run();

    await repository.saveStep('recommendation');
    expect(t.db.select().from(appState).get()).toMatchObject({
      owner: 'u1',
      catalogVersion: '3',
      onboardingStep: 4,
    });

    await repository.saveStep(null);
    expect(t.db.select().from(appState).get()?.onboardingStep).toBeNull();
  });
});
