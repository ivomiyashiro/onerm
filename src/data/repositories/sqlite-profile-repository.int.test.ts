import { openTestDatabase, type TestDatabase } from '@/data/db/open-test-database';
import { appState, profiles } from '@/data/db/schema';
import { ManualTableChanges } from '@/data/db/table-changes';
import { SqliteProfileRepository } from '@/data/repositories/sqlite-profile-repository';
import type { Profile } from '@/domain/models/profile';

const T0 = 1_780_000_000_000;
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

const PROFILE: Profile = {
  id: 'guest',
  level: 'novice',
  goal: 'health',
  daysPerWeek: 3,
  unit: 'kg',
  effortMode: 'simple',
  effortModeExplicit: false,
  loadIncrementsKg: { barbell: 2.5, dumbbell: 2, cable: 2.5, machine: 5, kettlebell: 4 },
  loadIncrementsLb: { barbell: 5, dumbbell: 5, cable: 5, machine: 10, kettlebell: 10 },
  barWeightKg: 20,
  barWeightLb: 45,
  activeRoutineId: null,
  onboardingCompletedAt: new Date(T0),
};

let t: TestDatabase;
let changes: ManualTableChanges;
let now: number;
let repository: SqliteProfileRepository;

beforeEach(() => {
  t = openTestDatabase();
  changes = new ManualTableChanges();
  now = T0;
  repository = new SqliteProfileRepository(
    () => t.db,
    changes,
    () => now,
  );
});

afterEach(() => {
  t.sqlite.close();
});

function observe() {
  const values: (Profile | null)[] = [];
  repository.observe({ next: (value) => values.push(value), error: jest.fn() });
  return () => values[values.length - 1];
}

describe('SqliteProfileRepository', () => {
  it('emits null before the onboarding creates the profile', () => {
    expect(observe()()).toBeNull();
  });

  it('saves the profile and emits it as it was saved, increments and dates included', async () => {
    const last = observe();

    await repository.save(PROFILE);
    changes.emit('profiles');
    await flush();

    expect(last()).toEqual(PROFILE);
  });

  it('a guest writes it with user_id null, pending push', async () => {
    await repository.save(PROFILE);

    expect(t.db.select().from(profiles).get()).toMatchObject({
      userId: null,
      dirty: true,
      createdAt: T0,
    });
  });

  it('a signed-in owner writes it with their user_id (RN-AUTH-06)', async () => {
    t.db.insert(appState).values({ owner: 'u1' }).run();

    await repository.save({ ...PROFILE, id: 'u1' });

    expect(t.db.select().from(profiles).get()).toMatchObject({ id: 'u1', userId: 'u1' });
  });

  it('an edit updates the same row with a later updated_at (RN-GEN-03)', async () => {
    await repository.save(PROFILE);
    now = T0 + 1_000;

    await repository.save({ ...PROFILE, goal: 'strength', activeRoutineId: 'r1' });

    expect(t.db.select().from(profiles).all()).toEqual([
      expect.objectContaining({ goal: 'strength', activeRoutineId: 'r1', updatedAt: T0 + 1_000 }),
    ]);
  });

  it('ignores a deleted profile', async () => {
    await repository.save(PROFILE);
    t.db.update(profiles).set({ deletedAt: T0 }).run();

    expect(observe()()).toBeNull();
  });

  it('rejects an invalid profile without writing it (CHECK)', async () => {
    // The native SqliteError doesn't always pass Jest's error check in `.rejects.toThrow`.
    const error = await repository.save({ ...PROFILE, daysPerWeek: 9 }).then(
      () => null,
      (reason: unknown) => reason,
    );

    expect(String(error)).toMatch(/CHECK constraint failed/);
    expect(t.db.select().from(profiles).all()).toEqual([]);
  });
});
