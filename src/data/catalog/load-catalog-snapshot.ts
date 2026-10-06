import type { CatalogSnapshot } from '@/data/catalog/catalog-snapshot';
import type { AppDatabase } from '@/data/db/app-database';
import {
  appState,
  exercises,
  routineTemplates,
  templateDays,
  templateExercises,
} from '@/data/db/schema';

/**
 * Writes the bundled catalog into the local database on the first run (RF-CAT-03, RN-CAT-04), in
 * one transaction: all of it or nothing. Once `app_state.catalog_version` is set it does nothing;
 * later catalog changes arrive through sync (RF-CAT-04, F6).
 */
export function loadCatalogSnapshot(db: AppDatabase, snapshot: CatalogSnapshot): void {
  db.transaction((tx) => {
    if (tx.select().from(appState).get()?.catalogVersion != null) return;

    tx.insert(exercises)
      .values(
        snapshot.exercises.map((exercise) => ({
          ...exercise,
          aliases: [...exercise.aliases],
          primaryMuscles: [...exercise.primaryMuscles],
          secondaryMuscles: [...exercise.secondaryMuscles],
          equipment: [...exercise.equipment],
          attributions: [...exercise.attributions],
          deprecatedAt: exercise.deprecatedAt?.getTime() ?? null,
        })),
      )
      .run();

    for (const { days, ...template } of snapshot.templates) {
      tx.insert(routineTemplates).values(template).run();
      for (const { exercises: dayExercises, ...day } of days) {
        tx.insert(templateDays)
          .values({ ...day, templateId: template.id })
          .run();
        tx.insert(templateExercises)
          .values(dayExercises.map((exercise) => ({ ...exercise, templateDayId: day.id })))
          .run();
      }
    }

    tx.insert(appState)
      .values({ catalogVersion: snapshot.version })
      .onConflictDoUpdate({ target: appState.id, set: { catalogVersion: snapshot.version } })
      .run();
  });
}
