import {
  isAuthRetryableFetchError,
  type AuthError,
  type SupabaseClient,
} from '@supabase/supabase-js';

import type { SessionStorage } from '@/data/auth/secure-session-storage';
import { parseRecoveryLink } from '@/data/auth/recovery-link';
import type {
  AuthGateway,
  AuthOutcome,
  NewPasswordOutcome,
  PasswordResetOutcome,
  RecoveryLinkOutcome,
} from '@/domain/repositories/auth-gateway';

/** Where supabase-js keeps the session; read here too to know the user without a connection. */
export const SESSION_STORAGE_KEY = 'onerm.auth.session';

/** Where the recovery link opens the app (the scheme of `app.config.ts`, and the S24 route). */
export const RECOVERY_REDIRECT = 'onerm://new-password';

/** Supabase Auth behind the domain's port (ADR-0001). */
export class SupabaseAuthGateway implements AuthGateway {
  /** Our own sign out also emits SIGNED_OUT, and that is not a loss. */
  private signingOut = false;

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

  async requestPasswordReset(email: string): Promise<PasswordResetOutcome> {
    const { error } = await this.client.auth.resetPasswordForEmail(email, {
      redirectTo: RECOVERY_REDIRECT,
    });
    if (!error) return 'sent';
    return isAuthRetryableFetchError(error) ? 'offline' : 'failed';
  }

  async openRecoveryLink(url: string): Promise<RecoveryLinkOutcome> {
    const tokens = parseRecoveryLink(url);
    if (tokens === null) return { status: 'invalidLink' };
    const { data, error } = await this.client.auth.setSession({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
    });
    if (error) {
      return isAuthRetryableFetchError(error) ? { status: 'offline' } : { status: 'invalidLink' };
    }
    if (!data.user) {
      await this.signOut();
      return { status: 'invalidLink' };
    }
    return { status: 'opened', userId: data.user.id, email: data.user.email ?? null };
  }

  async setNewPassword(password: string): Promise<NewPasswordOutcome> {
    const { data, error } = await this.client.auth.updateUser({ password });
    if (error)
      return isAuthRetryableFetchError(error) ? { status: 'offline' } : { status: 'failed' };
    return { status: 'done', userId: data.user.id };
  }

  async signOut(): Promise<void> {
    // The local scope doesn't call the server: signing out works without a connection.
    this.signingOut = true;
    try {
      await this.client.auth.signOut({ scope: 'local' });
    } finally {
      this.signingOut = false;
    }
  }

  onSessionLost(listener: () => void): () => void {
    // supabase-js emits SIGNED_OUT when the server refuses to renew or has revoked the session. A
    // failed renewal for lack of connection emits nothing: it retries later (RF-AUTH-06.AC2).
    const { data } = this.client.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT' && !this.signingOut) listener();
    });
    return () => data.subscription.unsubscribe();
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
