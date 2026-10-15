import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { SESSION_STORAGE_KEY, SupabaseAuthGateway } from '@/data/auth/supabase-auth-gateway';
import type { SessionStorage } from '@/data/auth/secure-session-storage';
import type {
  AuthGateway,
  AuthOutcome,
  NewPasswordOutcome,
  PasswordResetOutcome,
  RecoveryLinkOutcome,
} from '@/domain/repositories/auth-gateway';

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
}): SupabaseAuth {
  const client = createClient(config.url, config.publishableKey, {
    auth: {
      storage: config.storage,
      storageKey: SESSION_STORAGE_KEY,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
  return { client, gateway: new SupabaseAuthGateway(client, config.storage) };
}

/** Without a server configured (a build without the Supabase variables), nothing can sign in. */
export class UnconfiguredAuthGateway implements AuthGateway {
  async signUp(): Promise<AuthOutcome> {
    return { status: 'offline' };
  }

  async signIn(): Promise<AuthOutcome> {
    return { status: 'offline' };
  }

  async requestPasswordReset(): Promise<PasswordResetOutcome> {
    return 'offline';
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
