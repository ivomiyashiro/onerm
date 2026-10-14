/// <reference types="node" />
/**
 * @jest-environment node
 */
// What a client sees through PostgREST, with two real users (RNF-06, RNF-04, ADR-0002 6b).
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

const routine = (id: string, updatedAt: string, name: string) => ({
  id,
  created_at: '2026-10-01T10:00:00Z',
  updated_at: updatedAt,
  name,
});

describe('sync rules through PostgREST', () => {
  let a: Awaited<ReturnType<typeof signUp>>;
  let b: Awaited<ReturnType<typeof signUp>>;

  beforeAll(async () => {
    a = await signUp();
    b = await signUp();
  });

  it('the upsert returns the resulting row, also when the change loses (ADR-0002 6b)', async () => {
    const id = randomUUID();
    const first = await a.client
      .from('routines')
      .upsert(routine(id, '2026-10-01T11:00:00Z', 'winner'))
      .select()
      .single();
    expect(first.error).toBeNull();
    expect(first.data).toMatchObject({ name: 'winner', user_id: a.userId });

    const stale = await a.client
      .from('routines')
      .upsert(routine(id, '2026-10-01T10:30:00Z', 'stale'))
      .select()
      .single();
    expect(stale.error).toBeNull();
    expect(stale.data).toMatchObject({ name: 'winner' });
    expect(new Date(stale.data.server_updated_at).getTime()).toBeGreaterThan(
      new Date(first.data.server_updated_at).getTime(),
    );
  });

  it('resending the same change is idempotent (RNF-04)', async () => {
    const id = randomUUID();
    const row = routine(id, '2026-10-01T11:00:00Z', 'same');
    await a.client.from('routines').upsert(row);
    const again = await a.client.from('routines').upsert(row).select();
    expect(again.error).toBeNull();
    const { count } = await a.client
      .from('routines')
      .select('*', { count: 'exact', head: true })
      .eq('id', id);
    expect(count).toBe(1);
  });

  it('B neither reads nor modifies A rows (RNF-06)', async () => {
    const id = randomUUID();
    await a.client.from('routines').upsert(routine(id, '2026-10-01T11:00:00Z', 'mine'));

    const read = await b.client.from('routines').select().eq('id', id);
    expect(read.data).toEqual([]);

    const update = await b.client
      .from('routines')
      .update({ name: 'hacked', updated_at: '2026-10-02T00:00:00Z' })
      .eq('id', id)
      .select();
    expect(update.data).toEqual([]);

    // The ON CONFLICT hits a row B can't see: row-level security violation. The push treats it
    // as a final rejection of that row (RN-SYNC-11), not as a network error.
    const upsert = await b.client
      .from('routines')
      .upsert(routine(id, '2026-10-02T00:00:00Z', 'hacked'))
      .select();
    expect(upsert.error?.code).toBe('42501');

    const del = await b.client.from('routines').delete().eq('id', id).select();
    expect(del.data).toEqual([]);

    const still = await a.client.from('routines').select().eq('id', id).single();
    expect(still.data).toMatchObject({ name: 'mine', deleted_at: null });
  });

  it('an anonymous request sees no user data but reads the catalog config (RN-SYNC-14)', async () => {
    const anon = createClient(URL, KEY, { auth: { persistSession: false } });
    const { data } = await anon.from('routines').select();
    expect(data).toEqual([]);

    const config = await anon.from('app_config').select('min_app_version').single();
    expect(config.data).toEqual({ min_app_version: '0.0.0' });
  });

  it('a user cannot raise the minimum app version (RNF-08)', async () => {
    const update = await a.client
      .from('app_config')
      .update({ min_app_version: '99.0.0' })
      .eq('id', 1)
      .select();
    expect(update.data ?? []).toEqual([]);
    const config = await b.client.from('app_config').select('min_app_version').single();
    expect(config.data).toEqual({ min_app_version: '0.0.0' });
  });

  it('asks which sign-in method an email uses (RN-AUTH-03)', async () => {
    const { data } = await createClient(URL, KEY, { auth: { persistSession: false } }).rpc(
      'sign_in_method_for_email',
      { p_email: 'nobody@test.local' },
    );
    expect(data).toBeNull();
  });
});
