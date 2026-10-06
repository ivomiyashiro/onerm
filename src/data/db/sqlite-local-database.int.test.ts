import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

import { CATALOG_SNAPSHOT } from '@/data/catalog/catalog-snapshot';
import { loadCatalogSnapshot } from '@/data/catalog/load-catalog-snapshot';

import { SqliteLocalDatabase, type SqliteDriver } from './sqlite-local-database';

const MIGRATIONS_FOLDER = `${__dirname}/../../../drizzle`;

function testDriver(migrateImpl?: (db: BetterSQLite3Database) => void) {
  const connections: Database.Database[] = [];
  const driver: SqliteDriver<BetterSQLite3Database> = {
    inMemory: true,
    open() {
      const sqlite = new Database(':memory:');
      // Start like expo-sqlite, which opens without foreign keys (spike #11).
      sqlite.pragma('foreign_keys = OFF');
      connections.push(sqlite);
      return { db: drizzle(sqlite), execute: (statements) => sqlite.exec(statements) };
    },
    migrate: migrateImpl ?? ((db) => migrate(db, { migrationsFolder: MIGRATIONS_FOLDER })),
  };
  return { driver, connections };
}

describe('SqliteLocalDatabase (07 §6)', () => {
  it('opens the database with the PRAGMAs and applies the migrations', async () => {
    const { driver, connections } = testDriver();
    const local = new SqliteLocalDatabase(driver);

    await local.prepare();

    const [sqlite] = connections;
    expect(sqlite.pragma('foreign_keys', { simple: true })).toBe(1);
    expect(
      sqlite.prepare("select name from sqlite_master where name = 'workout_sets'").get(),
    ).toBeDefined();
    expect(local.database).toBeDefined();
  });

  it('is not usable before it is prepared', () => {
    const local = new SqliteLocalDatabase(testDriver().driver);
    expect(() => local.database).toThrow(/not prepared/);
  });

  it('rejects when a migration fails, keeps the connection and can retry', async () => {
    let attempts = 0;
    const { driver, connections } = testDriver((db) => {
      attempts += 1;
      if (attempts === 1) throw new Error('migration failed');
      migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
    });
    const local = new SqliteLocalDatabase(driver);

    await expect(local.prepare()).rejects.toThrow('migration failed');
    expect(() => local.database).toThrow(/not prepared/);

    await local.prepare();
    expect(connections).toHaveLength(1);
    expect(local.database).toBeDefined();
  });

  it('runs the after-migration step (the bundled catalog) before it is ready, and retries it', async () => {
    const afterMigrate = jest
      .fn<void, [BetterSQLite3Database]>()
      .mockImplementationOnce(() => {
        throw new Error('catalog failed');
      })
      .mockImplementationOnce((db) => loadCatalogSnapshot(db, CATALOG_SNAPSHOT));
    const { driver, connections } = testDriver();
    const local = new SqliteLocalDatabase(driver, afterMigrate);

    await expect(local.prepare()).rejects.toThrow('catalog failed');
    expect(() => local.database).toThrow(/not prepared/);

    await local.prepare();
    const [sqlite] = connections;
    expect(sqlite.prepare('select count(*) as n from exercises').get()).toEqual({ n: 22 });
  });
});
