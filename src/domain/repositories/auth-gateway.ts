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

/** The authentication provider (Supabase Auth). Everything here needs a connection unless noted. */
export interface AuthGateway {
  signUp(email: string, password: string): Promise<AuthOutcome>;
  signIn(email: string, password: string): Promise<AuthOutcome>;
  /** Drops the session on this device. It doesn't need a connection. */
  signOut(): Promise<void>;
  /** The session stored on the device, read without a connection (RF-AUTH-06.AC1). */
  storedSession(): Promise<{ userId: string; email: string | null } | null>;
}
