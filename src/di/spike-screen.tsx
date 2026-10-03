// SPIKE #11 — exploratory, not merged.
import { desc } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { useState } from 'react';
import { Button, ScrollView, Text, View } from 'react-native';

import migrations from '../../drizzle/migrations';
import { db, sqlite } from '@/data/db/client';
import { workoutSets, workouts } from '@/data/db/schema';

function Content() {
  const { data } = useLiveQuery(db.select().from(workouts).orderBy(desc(workouts.createdAt)));
  const { data: sets } = useLiveQuery(db.select().from(workoutSets));
  const [log, setLog] = useState<string[]>(() => {
    const mode = sqlite.getFirstSync<{ journal_mode: string }>('PRAGMA journal_mode');
    const fk = sqlite.getFirstSync<{ foreign_keys: number }>('PRAGMA foreign_keys');
    const v = sqlite.getFirstSync<{ v: string }>('select sqlite_version() as v');
    return [`journal_mode=${mode?.journal_mode} foreign_keys=${fk?.foreign_keys} sqlite=${v?.v}`];
  });
  const add = (line: string) => setLog((l) => [...l, line]);

  const insert = () => {
    const now = Date.now();
    const t0 = performance.now();
    db.insert(workouts)
      .values({ id: `w${now}`, createdAt: now, updatedAt: now, routineNameSnapshot: 'Spike', status: 'in_progress', startedAt: now })
      .run();
    add(`insert ${(performance.now() - t0).toFixed(2)} ms`);
  };

  const atomic = (fail: boolean) => {
    const now = Date.now();
    try {
      db.transaction((tx) => {
        tx.insert(workouts)
          .values({ id: `t${now}`, createdAt: now, updatedAt: now, routineNameSnapshot: 'Tx', status: 'in_progress', startedAt: now })
          .run();
        tx.insert(workoutSets)
          .values({ id: `s${now}`, workoutId: `t${now}`, createdAt: now, updatedAt: now, position: 1, loadKg: 60, reps: fail ? 999 : 8 })
          .run();
      });
      add('tx committed');
    } catch (e) {
      add(`tx rolled back: ${String(e).slice(0, 80)}`);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 24, gap: 8 }}>
      <Button title="Insert" onPress={insert} />
      <Button title="Tx ok" onPress={() => atomic(false)} />
      <Button title="Tx fail" onPress={() => atomic(true)} />
      <Text testID="counts">workouts={data.length} sets={sets.length}</Text>
      {log.map((l, i) => (
        <Text key={i}>{l}</Text>
      ))}
      {data.slice(0, 5).map((w) => (
        <Text key={w.id}>{w.id} {w.routineNameSnapshot} notes={String(w.notes)}</Text>
      ))}
    </ScrollView>
  );
}

export function SpikeScreen() {
  const { success, error } = useMigrations(db, migrations);
  if (error) return <Text style={{ padding: 48 }}>migration error: {error.message}</Text>;
  if (!success) return <Text style={{ padding: 48 }}>migrating…</Text>;
  return (
    <View style={{ flex: 1, paddingTop: 48 }}>
      <Content />
    </View>
  );
}
