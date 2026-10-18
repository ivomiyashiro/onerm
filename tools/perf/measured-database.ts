import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

import { CATALOG_SNAPSHOT } from '@/data/catalog/catalog-snapshot';
import { loadCatalogSnapshot } from '@/data/catalog/load-catalog-snapshot';
import { SqliteLocalDatabase } from '@/data/db/sqlite-local-database';
import { ManualTableChanges } from '@/data/db/table-changes';

const MIGRATIONS_FOLDER = `${__dirname}/../../drizzle`;
const WRITE = /^\s*(?:insert\s+into|update|delete\s+from)\s+"?(\w+)"?/i;

/**
 * The app's database on an in-memory better-sqlite3 one (#221), counting every SQL statement it
 * runs. A write that changed rows also tells `changes` which table it touched, as expo-sqlite does
 * on the phone (once per statement instead of once per row: `observeQuery` groups them either
 * way). One that changed nothing (`insert … on conflict do nothing`) tells nothing, also like it.
 */
export function measuredDatabase() {
  const statements: string[] = [];
  const changes = new ManualTableChanges();
  const localDatabase = new SqliteLocalDatabase(
    {
      inMemory: true,
      open() {
        const sqlite = new Database(':memory:', { verbose: (sql) => statements.push(String(sql)) });
        const prepare = sqlite.prepare.bind(sqlite);
        sqlite.prepare = ((sql: string) => {
          const statement = prepare(sql);
          const table = WRITE.exec(sql)?.[1];
          if (table === undefined) return statement;
          const run = statement.run.bind(statement);
          statement.run = (...params: unknown[]) => {
            const result = run(...params);
            if (result.changes > 0) changes.emit(table);
            return result;
          };
          return statement;
        }) as typeof sqlite.prepare;
        return { db: drizzle(sqlite), execute: (sql: string) => sqlite.exec(sql) };
      },
      migrate: (db) => migrate(db, { migrationsFolder: MIGRATIONS_FOLDER }),
    },
    (db) => loadCatalogSnapshot(db, CATALOG_SNAPSHOT),
  );
  return {
    storage: { localDatabase, changes },
    /** The statements since the last reset: reads (`select`) and writes. */
    sql() {
      const reads = statements.filter((s) => /^\s*select/i.test(s)).length;
      return { total: statements.length, reads, writes: statements.length - reads };
    },
    /** The statements since the last reset, grouped by their text, most repeated first. */
    topStatements(limit = 8): [string, number][] {
      const byText = new Map<string, number>();
      for (const s of statements) {
        const key = s.replace(/\s+/g, ' ').slice(0, 140);
        byText.set(key, (byText.get(key) ?? 0) + 1);
      }
      return [...byText.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
    },
    reset() {
      statements.length = 0;
    },
  };
}
