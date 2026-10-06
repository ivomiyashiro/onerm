import type { LocalDatabase } from '@/domain/repositories/local-database';

import type { AppDatabase } from './app-database';
import { connectionPragmas } from './connection-pragmas';

/** How to open and migrate one SQLite driver: expo-sqlite in the app, better-sqlite3 in tests. */
export interface SqliteDriver<TDatabase extends AppDatabase = AppDatabase> {
  /** In memory, WAL doesn't apply (spike #11). */
  inMemory: boolean;
  open(): { db: TDatabase; execute(statements: string): void };
  migrate(db: TDatabase): Promise<void> | void;
}

/**
 * The local database (ADR-0010): opened once, with the connection PRAGMAs, and migrated before
 * the UI mounts (07 §6). A failed migration leaves the database as it was and can be retried;
 * the database is never deleted.
 */
export class SqliteLocalDatabase<
  TDatabase extends AppDatabase = AppDatabase,
> implements LocalDatabase {
  private connection: TDatabase | null = null;
  private prepared = false;

  constructor(private readonly driver: SqliteDriver<TDatabase>) {}

  async prepare(): Promise<void> {
    if (this.connection === null) {
      const { db, execute } = this.driver.open();
      execute(connectionPragmas({ inMemory: this.driver.inMemory }));
      this.connection = db;
    }
    await this.driver.migrate(this.connection);
    this.prepared = true;
  }

  /** The database for the repositories, once `prepare()` resolved. */
  get database(): TDatabase {
    if (!this.prepared || this.connection === null) {
      throw new Error('The local database is not prepared yet: call prepare() first.');
    }
    return this.connection;
  }
}
