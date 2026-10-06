import { count } from 'drizzle-orm';

import { CATALOG_SNAPSHOT, type CatalogSnapshot } from '@/data/catalog/catalog-snapshot';
import { loadCatalogSnapshot } from '@/data/catalog/load-catalog-snapshot';
import { openTestDatabase, type TestDatabase } from '@/data/db/open-test-database';
import {
  appState,
  exercises,
  routineTemplates,
  templateDays,
  templateExercises,
} from '@/data/db/schema';

let t: TestDatabase;

beforeEach(() => {
  t = openTestDatabase();
});

afterEach(() => {
  t.sqlite.close();
});

function counts() {
  const rows = (
    table:
      typeof exercises | typeof routineTemplates | typeof templateDays | typeof templateExercises,
  ) => t.db.select({ n: count() }).from(table).get()?.n;
  return {
    exercises: rows(exercises),
    templates: rows(routineTemplates),
    days: rows(templateDays),
    templateExercises: rows(templateExercises),
  };
}

const EXPECTED = {
  exercises: 22,
  templates: 3,
  days: 8,
  templateExercises: 12 + 12 + 22,
};

describe('loadCatalogSnapshot (RF-CAT-03, RN-CAT-04)', () => {
  it('RF-CAT-03.AC1 · loads the whole bundled catalog on the first run', () => {
    loadCatalogSnapshot(t.db, CATALOG_SNAPSHOT);

    expect(counts()).toEqual(EXPECTED);
    expect(t.db.select().from(appState).get()).toMatchObject({
      owner: 'guest',
      catalogVersion: '1',
    });
  });

  it('stores an exercise as the snapshot has it', () => {
    loadCatalogSnapshot(t.db, CATALOG_SNAPSHOT);

    const [first] = CATALOG_SNAPSHOT.exercises;
    expect(t.db.select().from(exercises).all()).toContainEqual({ ...first, deprecatedAt: null });
  });

  it('keeps the template structure: days and exercises with their order, role and sets', () => {
    loadCatalogSnapshot(t.db, CATALOG_SNAPSHOT);

    expect(t.db.select().from(templateExercises).all()).toContainEqual({
      id: 'PLT-FB2-A1',
      templateDayId: 'PLT-FB2-A',
      exerciseId: CATALOG_SNAPSHOT.exercises[0].id,
      position: 1,
      role: 'main',
      sets: 4,
    });
  });

  it('does nothing once the catalog is loaded', () => {
    loadCatalogSnapshot(t.db, CATALOG_SNAPSHOT);
    loadCatalogSnapshot(t.db, CATALOG_SNAPSHOT);

    expect(counts()).toEqual(EXPECTED);
  });

  it('keeps the rest of app_state when it already exists', () => {
    t.db.insert(appState).values({ owner: 'u1', onboardingStep: 2 }).run();

    loadCatalogSnapshot(t.db, CATALOG_SNAPSHOT);

    expect(t.db.select().from(appState).get()).toMatchObject({
      owner: 'u1',
      onboardingStep: 2,
      catalogVersion: '1',
    });
  });

  it('loads all or nothing: a failure halfway leaves no partial catalog', () => {
    const broken: CatalogSnapshot = {
      ...CATALOG_SNAPSHOT,
      templates: [
        ...CATALOG_SNAPSHOT.templates,
        {
          ...CATALOG_SNAPSHOT.templates[0],
          days: [{ ...CATALOG_SNAPSHOT.templates[0].days[0], id: 'dup' }],
        },
      ],
    };

    expect(() => loadCatalogSnapshot(t.db, broken)).toThrow(/UNIQUE constraint failed/);
    expect(counts()).toEqual({ exercises: 0, templates: 0, days: 0, templateExercises: 0 });
    expect(t.db.select().from(appState).get()?.catalogVersion ?? null).toBeNull();
  });
});
