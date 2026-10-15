/// <reference types="node" />
/**
 * @jest-environment node
 */
// The auth gateway against local Supabase (RF-AUTH-02, RF-AUTH-03, RF-AUTH-06, RN-AUTH-02/03).
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';

import { createClient } from '@supabase/supabase-js';

import { SESSION_STORAGE_KEY, SupabaseAuthGateway } from '@/data/auth/supabase-auth-gateway';
import type { SessionStorage } from '@/data/auth/secure-session-storage';

const URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:55321';

/** The local stack's key comes from the CLI: nothing key-shaped is written in the repo. */
function publishableKey(): string {
  if (process.env.SUPABASE_PUBLISHABLE_KEY) return process.env.SUPABASE_PUBLISHABLE_KEY;
  const status = execFileSync('./node_modules/.bin/supabase', ['status', '-o', 'env'], {
    encoding: 'utf8',
  });
  const match = status.match(/^PUBLISHABLE_KEY="?([^"\n]+)"?$/m);
  if (!match) throw new Error('PUBLISHABLE_KEY not found in `supabase status`');
  return match[1];
}
const KEY = publishableKey();

function memoryStorage(): SessionStorage & { files: Map<string, string> } {
  const files = new Map<string, string>();
  return {
    files,
    getItem: async (name) => files.get(name) ?? null,
    setItem: async (name, value) => void files.set(name, value),
    removeItem: async (name) => void files.delete(name),
  };
}

function gateway(url = URL) {
  const storage = memoryStorage();
  const client = createClient(url, KEY, {
    auth: {
      storage,
      storageKey: SESSION_STORAGE_KEY,
      persistSession: true,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  return { gateway: new SupabaseAuthGateway(client, storage), storage, client };
}

const newEmail = () => `${randomUUID()}@test.local`;
const PASSWORD = 'contraseña-larga';

describe('SupabaseAuthGateway', () => {
  it('RF-AUTH-02.AC1: signs up and the session is stored', async () => {
    const { gateway: auth, storage } = gateway();

    const outcome = await auth.signUp(newEmail(), PASSWORD);

    expect(outcome).toMatchObject({ status: 'signedIn' });
    expect(storage.files.has(SESSION_STORAGE_KEY)).toBe(true);
    if (outcome.status === 'signedIn') {
      await expect(auth.storedSession()).resolves.toMatchObject({ userId: outcome.userId });
    }
  });

  it('RF-AUTH-02.AC3: an email with a password account is already taken', async () => {
    const email = newEmail();
    await gateway().gateway.signUp(email, PASSWORD);

    await expect(gateway().gateway.signUp(email, PASSWORD)).resolves.toEqual({
      status: 'emailTaken',
    });
  });

  it('RF-AUTH-03.AC1: signs in with the right credentials', async () => {
    const email = newEmail();
    const created = await gateway().gateway.signUp(email, PASSWORD);

    const outcome = await gateway().gateway.signIn(email, PASSWORD);

    expect(outcome).toEqual(created);
  });

  it('RF-AUTH-03.AC2, RN-AUTH-02: a wrong password and an unknown email look the same', async () => {
    const email = newEmail();
    await gateway().gateway.signUp(email, PASSWORD);

    await expect(gateway().gateway.signIn(email, 'otra-contraseña')).resolves.toEqual({
      status: 'wrongCredentials',
    });
    await expect(gateway().gateway.signIn(newEmail(), PASSWORD)).resolves.toEqual({
      status: 'wrongCredentials',
    });
  });

  it('RF-AUTH-02.AC4 / RF-AUTH-03.AC3: without a connection it says so', async () => {
    const { gateway: auth } = gateway('http://127.0.0.1:1');

    await expect(auth.signIn(newEmail(), PASSWORD)).resolves.toEqual({ status: 'offline' });
    await expect(auth.signUp(newEmail(), PASSWORD)).resolves.toEqual({ status: 'offline' });
  });

  it('RF-AUTH-06.AC1: the stored session is read without a connection', async () => {
    const { gateway: auth, storage } = gateway();
    const outcome = await auth.signUp(newEmail(), PASSWORD);

    // Same storage, a client that can't reach the server: like reopening the app in airplane mode.
    const offline = new SupabaseAuthGateway(
      createClient('http://127.0.0.1:1', KEY, {
        auth: { storage, storageKey: SESSION_STORAGE_KEY, autoRefreshToken: false },
      }),
      storage,
    );

    await expect(offline.storedSession()).resolves.toMatchObject({
      userId: outcome.status === 'signedIn' ? outcome.userId : null,
      email: expect.stringContaining('@'),
    });
  });

  it('signing out drops the stored session without a connection', async () => {
    const { gateway: auth, storage } = gateway();
    await auth.signUp(newEmail(), PASSWORD);

    await auth.signOut();

    expect(storage.files.has(SESSION_STORAGE_KEY)).toBe(false);
    await expect(auth.storedSession()).resolves.toBeNull();
  });

  it('is null when there is no session, or the stored one is garbage', async () => {
    const { gateway: auth, storage } = gateway();
    await expect(auth.storedSession()).resolves.toBeNull();

    storage.files.set(SESSION_STORAGE_KEY, 'not json');
    await expect(auth.storedSession()).resolves.toBeNull();
  });
});
