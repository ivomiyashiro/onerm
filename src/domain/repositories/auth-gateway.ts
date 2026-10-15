/** What the server answered to a sign-up or a sign-in (RF-AUTH-02, RF-AUTH-03, RN-AUTH-02/03). */
export type AuthOutcome =
  | { status: 'signedIn'; userId: string }
  | { status: 'wrongCredentials' }
  /** Sign-up with an email that already has a password account (RF-AUTH-02.AC3). */
  | { status: 'emailTaken' }
  /** Sign-up with an email whose account is a Google one (RN-AUTH-03). */
  | { status: 'useGoogle' }
  | { status: 'offline' }
  | { status: 'failed' };

/** What the server answered to a password reset request (RF-AUTH-08.AC1). */
export type PasswordResetOutcome = 'sent' | 'offline' | 'failed';

/** What «Continuar con Google» did (RF-AUTH-04). */
export type GoogleOutcome =
  | { status: 'signedIn'; userId: string; email: string }
  /** The person closed Google's screen: nothing to tell (AC4). */
  | { status: 'cancelled' }
  /** The email already has a password account; nothing is linked or created (RN-AUTH-03, AC3). */
  | { status: 'useYourPassword' }
  | { status: 'offline' }
  | { status: 'failed' };

/** What opening the recovery link did (RF-AUTH-08.AC2, AC3). */
export type RecoveryLinkOutcome =
  /** The link is good: a recovery session is open, only to set the new password. */
  | { status: 'opened'; userId: string; email: string | null }
  /** Expired, already used, or not a recovery link (RF-AUTH-08.AC3). */
  | { status: 'invalidLink' }
  | { status: 'offline' }
  | { status: 'failed' };

export type NewPasswordOutcome =
  { status: 'done'; userId: string } | { status: 'offline' } | { status: 'failed' };

/** The authentication provider (Supabase Auth). Everything here needs a connection unless noted. */
export interface AuthGateway {
  signUp(email: string, password: string): Promise<AuthOutcome>;
  signIn(email: string, password: string): Promise<AuthOutcome>;
  /** Google's account picker, then the sign-in with its ID token (RF-AUTH-04). */
  signInWithGoogle(): Promise<GoogleOutcome>;
  /**
   * Sends the recovery email. It answers `sent` whether the account exists or not, so it never
   * tells (RN-AUTH-02).
   */
  requestPasswordReset(email: string): Promise<PasswordResetOutcome>;
  /** Opens the session the recovery link carries; `url` is the link as the app received it. */
  openRecoveryLink(url: string): Promise<RecoveryLinkOutcome>;
  /** Sets the new password of the recovery session. */
  setNewPassword(password: string): Promise<NewPasswordOutcome>;
  /** Drops the session on this device. It doesn't need a connection. */
  signOut(): Promise<void>;
  /**
   * Tells when the server refused to renew the session or revoked it (RF-AUTH-06.AC4). Signing out
   * on purpose doesn't count, and neither does a failed renewal for lack of connection.
   */
  onSessionLost(listener: () => void): () => void;
  /** The session stored on the device, read without a connection (RF-AUTH-06.AC1). */
  storedSession(): Promise<{ userId: string; email: string | null } | null>;
}
