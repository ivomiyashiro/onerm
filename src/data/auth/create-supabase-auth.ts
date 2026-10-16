import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { fetchWithTimeout } from '@/data/auth/fetch-with-timeout';
import { SESSION_STORAGE_KEY, SupabaseAuthGateway } from '@/data/auth/supabase-auth-gateway';
import type { GoogleAccountPicker } from '@/data/auth/google-account-picker';
import type { SessionStorage } from '@/data/auth/secure-session-storage';
import type {
  AuthGateway,
  AuthOutcome,
  GoogleOutcome,
  NewPasswordOutcome,
  PasswordResetOutcome,
  RecoveryLinkOutcome,
} from '@/domain/repositories/auth-gateway';

/** A request without an answer in this time fails like a network error (07 §4.1, #175). */
const NETWORK_TIMEOUT_MS = 15_000;

export interface SupabaseAuth {
  gateway: AuthGateway;
  client: SupabaseClient;
}

/**
 * The supabase-js client, created once at the composition root (spike #15): a client built in a
 * module that reloads would leave old ones alive with their refresh timers. Only the publishable
 * key is used here; the `service_role` never enters the app (RNF-08).
 */
export function createSupabaseAuth(config: {
  url: string;
  publishableKey: string;
  storage: SessionStorage;
  /** Without it «Continuar con Google» can't be used. */
  google?: GoogleAccountPicker;
}): SupabaseAuth {
  const client = createClient(config.url, config.publishableKey, {
    auth: {
      storage: config.storage,
      storageKey: SESSION_STORAGE_KEY,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
    global: { fetch: fetchWithTimeout(fetch, NETWORK_TIMEOUT_MS) },
  });
  return {
    client,
    gateway: new SupabaseAuthGateway(client, config.storage, config.google ?? null),
  };
}

/** Without a server configured (a build without the Supabase variables), nothing can sign in. */
export class UnconfiguredAuthGateway implements AuthGateway {
  async signUp(): Promise<AuthOutcome> {
    return { status: 'offline' };
  }

  async signIn(): Promise<AuthOutcome> {
    return { status: 'offline' };
  }

  async signInWithGoogle(): Promise<GoogleOutcome> {
    return { status: 'offline' };
  }

  async requestPasswordReset(): Promise<PasswordResetOutcome> {
    return 'offline';
  }

  recoveryLinkUser(): null {
    return null;
  }

  async openRecoveryLink(): Promise<RecoveryLinkOutcome> {
    return { status: 'offline' };
  }

  async setNewPassword(): Promise<NewPasswordOutcome> {
    return { status: 'offline' };
  }

  async signOut(): Promise<void> {}

  onSessionLost(): () => void {
    return () => {};
  }

  async storedSession(): Promise<null> {
    return null;
  }
}
