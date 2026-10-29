import { eq } from 'drizzle-orm';

import { CATALOG_SNAPSHOT } from '@/data/catalog/catalog-snapshot';
import { loadCatalogSnapshot } from '@/data/catalog/load-catalog-snapshot';
import { openTestDatabase, type TestDatabase } from '@/data/db/open-test-database';
import { exercises } from '@/data/db/schema';
import { ManualTableChanges } from '@/data/db/table-changes';
import { SqliteExerciseRepository } from '@/data/repositories/sqlite-exercise-repository';
import { SqliteRoutineTemplateRepository } from '@/data/repositories/sqlite-routine-template-repository';
import type { Exercise } from '@/domain/models/exercise';
import type { RoutineTemplate } from '@/domain/models/routine-template';

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

let t: TestDatabase;
let changes: ManualTableChanges;

beforeEach(() => {
  t = openTestDatabase();
  changes = new ManualTableChanges();
  loadCatalogSnapshot(t.db, CATALOG_SNAPSHOT);
});

afterEach(() => {
  t.sqlite.close();
});

function lastValue<T>(
  observe: (observer: { next(v: T): void; error(e: unknown): void }) => unknown,
) {
  const values: T[] = [];
  const error = jest.fn();
  observe({ next: (value) => values.push(value), error });
  return { values, error, last: () => values[values.length - 1] };
}

describe('SqliteExerciseRepository', () => {
  it('emits the catalog as the snapshot has it (RF-CAT-03)', () => {
    const repository = new SqliteExerciseRepository(() => t.db, changes);

    const { last, error } = lastValue<Exercise[]>((o) => repository.observeAll(o));

    expect(error).not.toHaveBeenCalled();
    expect(last()).toHaveLength(CATALOG_SNAPSHOT.exercises.length);
    expect(last()).toContainEqual(CATALOG_SNAPSHOT.exercises[0]);
  });

  it('#230: a row rewritten with the same values emits nothing', async () => {
    const repository = new SqliteExerciseRepository(() => t.db, changes);
    const { values } = lastValue<Exercise[]>((o) => repository.observeAll(o));
    const row = t.db.select().from(exercises).limit(1).get()!;

    t.db.update(exercises).set(row).where(eq(exercises.id, row.id)).run();
    changes.emit('exercises');
    await flush();

    expect(values).toHaveLength(1);
  });

  it('reads the technique, the machine and the video of an exercise (#306)', async () => {
    const repository = new SqliteExerciseRepository(() => t.db, changes);
    const { last } = lastValue<Exercise[]>((o) => repository.observeAll(o));
    const [first] = CATALOG_SNAPSHOT.exercises;
    const help = {
      technique: { steps: ['Sentate.', 'Empujá.'], mistakes: ['Trabar las rodillas.'] },
      machine: 'leg-press' as const,
      videoUrl: 'https://youtu.be/abc',
    };

    t.db.update(exercises).set(help).where(eq(exercises.id, first.id)).run();
    changes.emit('exercises');
    await flush();

    expect(last().find((exercise) => exercise.id === first.id)).toEqual({ ...first, ...help });
  });

  it('includes deprecated exercises, with deprecatedAt as a Date (RN-CAT-01)', async () => {
    const repository = new SqliteExerciseRepository(() => t.db, changes);
    const { last } = lastValue<Exercise[]>((o) => repository.observeAll(o));
    const [first] = CATALOG_SNAPSHOT.exercises;

    t.db
      .update(exercises)
      .set({ deprecatedAt: 1_780_000_000_000 })
      .where(eq(exercises.id, first.id))
      .run();
    changes.emit('exercises');
    await flush();

    expect(last()).toHaveLength(CATALOG_SNAPSHOT.exercises.length);
    expect(last().find((e) => e.id === first.id)?.deprecatedAt).toEqual(
      new Date(1_780_000_000_000),
    );
  });
});

describe('SqliteExerciseRepository.observeById', () => {
  it('emits the exercise with that id (RF-CAT-02)', () => {
    const repository = new SqliteExerciseRepository(() => t.db, changes);
    const [first] = CATALOG_SNAPSHOT.exercises;

    const { last } = lastValue<Exercise | null>((o) => repository.observeById(first.id, o));

    expect(last()).toEqual(first);
  });

  it('emits null for an id that is not in the catalog (RN-CAT-04)', () => {
    const repository = new SqliteExerciseRepository(() => t.db, changes);

    const { last } = lastValue<Exercise | null>((o) => repository.observeById('missing', o));

    expect(last()).toBeNull();
  });

  it('runs again when the catalog changes', async () => {
    const repository = new SqliteExerciseRepository(() => t.db, changes);
    const [first] = CATALOG_SNAPSHOT.exercises;
    const { last } = lastValue<Exercise | null>((o) => repository.observeById(first.id, o));

    t.db
      .update(exercises)
      .set({ deprecatedAt: 1_780_000_000_000 })
      .where(eq(exercises.id, first.id))
      .run();
    changes.emit('exercises');
    await flush();

    expect(last()?.deprecatedAt).toEqual(new Date(1_780_000_000_000));
  });
});

describe('SqliteRoutineTemplateRepository', () => {
  it('emits the templates with their days and exercises, as the snapshot has them', () => {
    const repository = new SqliteRoutineTemplateRepository(() => t.db, changes);

    const { last } = lastValue<RoutineTemplate[]>((o) => repository.observeAll(o));

    expect(last()).toEqual(CATALOG_SNAPSHOT.templates);
  });

  it('orders days and exercises by (position, id) (I-10)', () => {
    t.sqlite.exec("update template_days set position = 9 where id = 'PLT-FB3-A'");
    t.sqlite.exec("update template_exercises set position = 0 where id = 'PLT-FB3-B6'");
    const repository = new SqliteRoutineTemplateRepository(() => t.db, changes);

    const { last } = lastValue<RoutineTemplate[]>((o) => repository.observeAll(o));
    const fb3 = last().find((template) => template.id === 'PLT-FB3');

    expect(fb3?.days.map((day) => day.id)).toEqual(['PLT-FB3-B', 'PLT-FB3-A']);
    expect(fb3?.days[0].exercises[0].id).toBe('PLT-FB3-B6');
  });
});
