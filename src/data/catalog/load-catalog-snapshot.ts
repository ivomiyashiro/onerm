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
 * Writes the bundled catalog into the local database (RF-CAT-03, RN-CAT-04), in one transaction:
 * all of it or nothing.
 * - First run (no `catalog_version`): the whole snapshot.
 * - A newer snapshot (an app update): only the exercises and templates that are missing. The
 *   existing rows are kept: their ids and key attributes never change (RN-CAT-05), and the ones
 *   pulled from the server may be newer than the bundle (RF-CAT-04).
 * - The same or an older snapshot: nothing.
 * Versions are increasing whole numbers.
 */
export function loadCatalogSnapshot(db: AppDatabase, snapshot: CatalogSnapshot): void {
  db.transaction((tx) => {
    const stored = tx.select().from(appState).get()?.catalogVersion ?? null;
    if (stored !== null && Number(stored) >= Number(snapshot.version)) return;

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
      .onConflictDoNothing()
      .run();

    for (const { days, ...template } of snapshot.templates) {
      tx.insert(routineTemplates).values(template).onConflictDoNothing().run();
      for (const { exercises: dayExercises, ...day } of days) {
        tx.insert(templateDays)
          .values({ ...day, templateId: template.id })
          .onConflictDoNothing()
          .run();
        tx.insert(templateExercises)
          .values(dayExercises.map((exercise) => ({ ...exercise, templateDayId: day.id })))
          .onConflictDoNothing()
          .run();
      }
    }

    tx.insert(appState)
      .values({ catalogVersion: snapshot.version })
      .onConflictDoUpdate({ target: appState.id, set: { catalogVersion: snapshot.version } })
      .run();
  });
}
