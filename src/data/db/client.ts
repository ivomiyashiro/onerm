import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

// enableChangeListener: required by useLiveQuery.
export const sqlite = openDatabaseSync('onerm.db', { enableChangeListener: true });
// expo-sqlite opens with journal_mode=delete and foreign_keys=0: both must be set on every open.
sqlite.execSync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
export const db = drizzle(sqlite);
