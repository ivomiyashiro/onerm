import type { AppDatabase } from '@/data/db/app-database';
import { observeQuery } from '@/data/db/observe-query';
import { routineTemplates, templateDays, templateExercises } from '@/data/db/schema';
import type { TableChanges } from '@/data/db/table-changes';
import { toRoutineTemplates } from '@/data/mappers/catalog-mappers';
import type { RoutineTemplate } from '@/domain/models/routine-template';
import type { Observer, Unsubscribe } from '@/domain/repositories/observer';
import type { RoutineTemplateRepository } from '@/domain/repositories/routine-template-repository';

/** The templates in the local database: read-only for the app (06 §2). */
export class SqliteRoutineTemplateRepository implements RoutineTemplateRepository {
  constructor(
    private readonly db: () => AppDatabase,
    private readonly changes: TableChanges,
  ) {}

  observeAll(observer: Observer<RoutineTemplate[]>): Unsubscribe {
    return observeQuery(
      this.changes,
      [routineTemplates, templateDays, templateExercises],
      () => {
        const db = this.db();
        return toRoutineTemplates(
          db.select().from(routineTemplates).orderBy(routineTemplates.daysPerWeek).all(),
          db.select().from(templateDays).all(),
          db.select().from(templateExercises).all(),
        );
      },
      observer,
    );
  }
}
