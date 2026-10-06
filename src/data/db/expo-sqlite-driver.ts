import { drizzle, type ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import { openDatabaseSync } from 'expo-sqlite';

import migrations from '../../../drizzle/migrations';

import type { SqliteDriver } from './sqlite-local-database';

export const DATABASE_NAME = 'onerm.db';

/**
 * The app's driver: the `onerm.db` file of expo-sqlite, with the migrations bundled from
 * drizzle/ (Metro + inline-import). `enableChangeListener` lets the repositories observe changes
 * (#29). Checked on the emulator: it needs the native module.
 */
export const expoSqliteDriver: SqliteDriver<ExpoSQLiteDatabase> = {
  inMemory: false,
  open() {
    const sqlite = openDatabaseSync(DATABASE_NAME, { enableChangeListener: true });
    return { db: drizzle(sqlite), execute: (statements) => sqlite.execSync(statements) };
  },
  migrate: (db) => migrate(db, migrations),
};
