import { or, sql } from 'drizzle-orm';
import type { SQLiteColumn } from 'drizzle-orm/sqlite-core';

import type { CatalogSnapshot } from '@/data/catalog/catalog-snapshot';
import type { AppDatabase } from '@/data/db/app-database';
import {
  appState,
  exercises,
  routineTemplates,
  templateDays,
  templateExercises,
} from '@/data/db/schema';

const HELP = [exercises.technique, exercises.machine, exercises.videoUrl];

/** The local value, or the bundle's when there is none. */
const fill = (column: SQLiteColumn) =>
  sql`coalesce(${column}, excluded.${sql.identifier(column.name)})`;

/** The row has no value and the bundle brings one. */
const lacks = (column: SQLiteColumn) =>
  sql`${column} is null and excluded.${sql.identifier(column.name)} is not null`;

/**
 * Writes the bundled catalog into the local database (RF-CAT-03, RN-CAT-04), in one transaction:
 * all of it or nothing.
 * - First run (no `catalog_version`): the whole snapshot.
 * - A newer snapshot (an app update): only the exercises and templates that are missing. The
 *   existing rows are kept: their ids and key attributes never change (RN-CAT-05), and the ones
 *   pulled from the server may be newer than the bundle (RF-CAT-04). The one exception is the help
 *   of an exercise (#306): what a row lacks is filled from the bundle, so an install from before
 *   it has it offline too, and what it has is kept.
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
      .onConflictDoUpdate({
        target: exercises.id,
        set: {
          technique: fill(exercises.technique),
          machine: fill(exercises.machine),
          videoUrl: fill(exercises.videoUrl),
        },
        setWhere: or(...HELP.map(lacks)),
      })
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
