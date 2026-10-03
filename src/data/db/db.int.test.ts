/// <reference types="node" />
/**
 * @jest-environment node
 */
import path from 'node:path';

import Database from 'better-sqlite3';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

import { workoutSets, workouts } from './schema';

function openTestDb() {
  const sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');
  const db = drizzle(sqlite);
  migrate(db, { migrationsFolder: path.resolve(__dirname, '../../../drizzle') });
  return { sqlite, db };
}

const now = 1_700_000_000_000;
const workout = {
  id: 'w1',
  createdAt: now,
  updatedAt: now,
  routineNameSnapshot: 'Full body',
  status: 'in_progress' as const,
  startedAt: now,
};
const set = (id: string, reps: number) => ({
  id,
  workoutId: 'w1',
  createdAt: now,
  updatedAt: now,
  position: 1,
  loadKg: 62.5,
  reps,
});

describe('spike #11 · drizzle on better-sqlite3', () => {
  it('applies the drizzle-kit migrations and round-trips a row', () => {
    const { db } = openTestDb();
    db.insert(workouts).values(workout).run();
    expect(db.select().from(workouts).all()).toEqual([
      expect.objectContaining({ id: 'w1', dirty: true, deletedAt: null }),
    ]);
  });

  it('writes parent and child atomically', () => {
    const { db } = openTestDb();
    expect(() =>
      db.transaction((tx) => {
        tx.insert(workouts).values(workout).run();
        tx.insert(workoutSets).values(set('s1', 8)).run();
        tx.insert(workoutSets).values(set('s2', 999)).run(); // violates the reps CHECK
      }),
    ).toThrow(/CHECK constraint failed/);
    expect(db.select().from(workouts).all()).toEqual([]);
    expect(db.select().from(workoutSets).all()).toEqual([]);
  });

  it('enforces the workout FK', () => {
    const { db } = openTestDb();
    expect(() => db.insert(workoutSets).values(set('s1', 8)).run()).toThrow(/FOREIGN KEY/);
    db.insert(workouts).values(workout).run();
    db.insert(workoutSets).values(set('s1', 8)).run();
    expect(db.select().from(workoutSets).where(eq(workoutSets.workoutId, 'w1')).all()).toHaveLength(
      1,
    );
  });
});
