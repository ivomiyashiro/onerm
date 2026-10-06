import type { LocalDatabase } from '@/domain/repositories/local-database';

import type { AppDatabase } from './app-database';
import { connectionPragmas } from './connection-pragmas';

/** A local database the repositories can read once it is prepared. */
export interface PreparedLocalDatabase extends LocalDatabase {
  /** Throws until `prepare()` resolved. */
  readonly database: AppDatabase;
}

/** How to open and migrate one SQLite driver: expo-sqlite in the app, better-sqlite3 in tests. */
export interface SqliteDriver<TDatabase extends AppDatabase = AppDatabase> {
  /** In memory, WAL doesn't apply (spike #11). */
  inMemory: boolean;
  open(): { db: TDatabase; execute(statements: string): void };
  migrate(db: TDatabase): Promise<void> | void;
}

/**
 * The local database (ADR-0010): opened once, with the connection PRAGMAs, and migrated before
 * the UI mounts (07 §6), then given the bundled catalog. A failed step leaves the database as
 * it was and can be retried; the database is never deleted.
 */
export class SqliteLocalDatabase<
  TDatabase extends AppDatabase = AppDatabase,
> implements LocalDatabase {
  private connection: TDatabase | null = null;
  private prepared = false;

  /**
   * @param afterMigrate runs once the schema is up to date, before the database is ready: the
   * bundled catalog (RF-CAT-03). It has to be idempotent, because a retry runs it again.
   */
  constructor(
    private readonly driver: SqliteDriver<TDatabase>,
    private readonly afterMigrate: (db: TDatabase) => void = () => {},
  ) {}

  async prepare(): Promise<void> {
    if (this.connection === null) {
      const { db, execute } = this.driver.open();
      execute(connectionPragmas({ inMemory: this.driver.inMemory }));
      this.connection = db;
    }
    await this.driver.migrate(this.connection);
    this.afterMigrate(this.connection);
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
