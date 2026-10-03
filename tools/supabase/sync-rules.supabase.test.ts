/// <reference types="node" />
/**
 * @jest-environment node
 */
// SPIKE #12: the 07 §3 rules seen through PostgREST, with two real users.
import { randomUUID } from 'node:crypto';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:55321';
const KEY =
  process.env.SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';

async function signUp(): Promise<{ client: SupabaseClient; userId: string }> {
  const client = createClient(URL, KEY, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signUp({
    email: `${randomUUID()}@test.local`,
    password: 'password-123',
  });
  if (error) throw error;
  return { client, userId: data.user!.id };
}

const workout = (id: string, updatedAt: string, name: string) => ({
  id,
  created_at: '2026-10-01T10:00:00Z',
  updated_at: updatedAt,
  routine_name_snapshot: name,
  status: 'finished',
});

describe('spike #12 · sync rules through PostgREST', () => {
  let a: Awaited<ReturnType<typeof signUp>>;
  let b: Awaited<ReturnType<typeof signUp>>;

  beforeAll(async () => {
    a = await signUp();
    b = await signUp();
  });

  it('upsert returns the resulting row, also when the change loses (ADR-0002 6b)', async () => {
    const id = randomUUID();
    const first = await a.client
      .from('workouts')
      .upsert(workout(id, '2026-10-01T11:00:00Z', 'winner'))
      .select()
      .single();
    expect(first.error).toBeNull();
    expect(first.data).toMatchObject({ routine_name_snapshot: 'winner', user_id: a.userId });

    const stale = await a.client
      .from('workouts')
      .upsert(workout(id, '2026-10-01T10:30:00Z', 'stale'))
      .select()
      .single();
    expect(stale.error).toBeNull();
    expect(stale.data).toMatchObject({ routine_name_snapshot: 'winner' });
    expect(new Date(stale.data.server_updated_at).getTime()).toBeGreaterThan(
      new Date(first.data.server_updated_at).getTime(),
    );
  });

  it('resending the same change is idempotent (RNF-04)', async () => {
    const id = randomUUID();
    const row = workout(id, '2026-10-01T11:00:00Z', 'same');
    await a.client.from('workouts').upsert(row);
    const again = await a.client.from('workouts').upsert(row).select();
    expect(again.error).toBeNull();
    const { count } = await a.client
      .from('workouts')
      .select('*', { count: 'exact', head: true })
      .eq('id', id);
    expect(count).toBe(1);
  });

  it('B neither reads nor modifies A rows (RNF-06)', async () => {
    const id = randomUUID();
    await a.client.from('workouts').upsert(workout(id, '2026-10-01T11:00:00Z', 'mine'));

    const read = await b.client.from('workouts').select().eq('id', id);
    expect(read.data).toEqual([]);

    const update = await b.client
      .from('workouts')
      .update({ routine_name_snapshot: 'hacked', updated_at: '2026-10-02T00:00:00Z' })
      .eq('id', id)
      .select();
    expect(update.data).toEqual([]);

    const upsert = await b.client
      .from('workouts')
      .upsert(workout(id, '2026-10-02T00:00:00Z', 'hacked'))
      .select();
    expect(upsert.error?.code).toBe('42501'); // row-level security violation

    const del = await b.client.from('workouts').delete().eq('id', id).select();
    expect(del.data).toEqual([]);

    const still = await a.client.from('workouts').select().eq('id', id).single();
    expect(still.data).toMatchObject({ routine_name_snapshot: 'mine', deleted_at: null });
  });

  it('anonymous requests see nothing', async () => {
    const anon = createClient(URL, KEY, { auth: { persistSession: false } });
    const { data } = await anon.from('workouts').select();
    expect(data).toEqual([]);
  });
});
