import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

import type { AppDatabase } from './app-database';
import { connectionPragmas } from './connection-pragmas';
import { SqliteLocalDatabase, type PreparedLocalDatabase } from './sqlite-local-database';

// The same migrations the app bundles (drizzle/migrations.js reads the same .sql files).
const MIGRATIONS_FOLDER = `${__dirname}/../../../drizzle`;

export interface TestDatabase {
  db: AppDatabase;
  /** The raw connection, to write rows that skip Drizzle's types. */
  sqlite: Database.Database;
}

/**
 * A fresh in-memory SQLite database with the app's migrations and PRAGMAs, for the integration
 * tests (`*.int.test.ts`). Only for tests: better-sqlite3 is a dev dependency and runs on Node.
 */
export function openTestDatabase(): TestDatabase {
  const sqlite = new Database(':memory:');
  sqlite.exec(connectionPragmas({ inMemory: true }));
  const db = drizzle(sqlite);
  migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  return { db, sqlite };
}

/**
 * The app's `SqliteLocalDatabase` on an in-memory better-sqlite3 database, for tests that wire the
 * whole app (the composition root). `prepare()` migrates it and runs `afterMigrate`.
 */
export function openTestLocalDatabase(
  afterMigrate?: (db: AppDatabase) => void,
): PreparedLocalDatabase {
  return new SqliteLocalDatabase(
    {
      inMemory: true,
      open() {
        const sqlite = new Database(':memory:');
        return { db: drizzle(sqlite), execute: (statements: string) => sqlite.exec(statements) };
      },
      migrate: (db) => migrate(db, { migrationsFolder: MIGRATIONS_FOLDER }),
    },
    afterMigrate,
  );
}
