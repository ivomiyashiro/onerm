import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';

/**
 * The database the repositories receive: the type both drivers share (expo-sqlite in the app,
 * better-sqlite3 in the integration tests), so the same code runs on both (spike #11).
 */
export type AppDatabase = BaseSQLiteDatabase<'sync', unknown>;
