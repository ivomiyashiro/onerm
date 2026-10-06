import type { AppDatabase } from '@/data/db/app-database';
import { observeQuery } from '@/data/db/observe-query';
import { exercises } from '@/data/db/schema';
import type { TableChanges } from '@/data/db/table-changes';
import { toExercise } from '@/data/mappers/catalog-mappers';
import type { Exercise } from '@/domain/models/exercise';
import type { ExerciseRepository } from '@/domain/repositories/exercise-repository';
import type { Observer, Unsubscribe } from '@/domain/repositories/observer';

/** The catalog in the local database: read-only for the app (06 §2). */
export class SqliteExerciseRepository implements ExerciseRepository {
  constructor(
    private readonly db: () => AppDatabase,
    private readonly changes: TableChanges,
  ) {}

  observeAll(observer: Observer<Exercise[]>): Unsubscribe {
    return observeQuery(
      this.changes,
      [exercises],
      () => this.db().select().from(exercises).all().map(toExercise),
      observer,
    );
  }
}
