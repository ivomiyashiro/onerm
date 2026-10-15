import {
  isAuthRetryableFetchError,
  type AuthError,
  type SupabaseClient,
} from '@supabase/supabase-js';

import type { SessionStorage } from '@/data/auth/secure-session-storage';
import type { AuthGateway, AuthOutcome } from '@/domain/repositories/auth-gateway';

/** Where supabase-js keeps the session; read here too to know the user without a connection. */
export const SESSION_STORAGE_KEY = 'onerm.auth.session';

/** Supabase Auth behind the domain's port (ADR-0001). */
export class SupabaseAuthGateway implements AuthGateway {
  constructor(
    private readonly client: SupabaseClient,
    private readonly storage: Pick<SessionStorage, 'getItem'>,
  ) {}

  async signUp(email: string, password: string): Promise<AuthOutcome> {
    const { data, error } = await this.client.auth.signUp({ email, password });
    if (error) {
      if (error.code === 'user_already_exists') return this.takenBy(email);
      return failure(error);
    }
    // The MVP doesn't ask to confirm the email (Q-01): a session comes with the account.
    return data.user && data.session ? { status: 'signedIn', userId: data.user.id } : FAILED;
  }

  async signIn(email: string, password: string): Promise<AuthOutcome> {
    const { data, error } = await this.client.auth.signInWithPassword({ email, password });
    if (error) return failure(error);
    return { status: 'signedIn', userId: data.user.id };
  }

  async signOut(): Promise<void> {
    // The local scope doesn't call the server: signing out works without a connection.
    await this.client.auth.signOut({ scope: 'local' });
  }

  async storedSession(): Promise<{ userId: string; email: string | null } | null> {
    // Not `auth.getSession()`: with an expired token it tries to renew it, and offline that would
    // look like a lost session (RF-AUTH-06.AC2).
    const stored = await this.storage.getItem(SESSION_STORAGE_KEY);
    if (stored === null) return null;
    try {
      const user = (JSON.parse(stored) as { user?: { id?: unknown; email?: unknown } }).user;
      if (typeof user?.id !== 'string') return null;
      return { userId: user.id, email: typeof user.email === 'string' ? user.email : null };
    } catch {
      return null;
    }
  }

  /** RN-AUTH-03: an email of a Google account is told apart from one with a password. */
  private async takenBy(email: string): Promise<AuthOutcome> {
    const { data } = await this.client.rpc('sign_in_method_for_email', { p_email: email });
    return data === 'google' ? { status: 'useGoogle' } : { status: 'emailTaken' };
  }
}

const FAILED: AuthOutcome = { status: 'failed' };

function failure(error: AuthError): AuthOutcome {
  if (isAuthRetryableFetchError(error)) return { status: 'offline' };
  if (error.code === 'invalid_credentials') return { status: 'wrongCredentials' };
  return FAILED;
}
