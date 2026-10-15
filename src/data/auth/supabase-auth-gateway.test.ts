import {
  AuthRetryableFetchError,
  type AuthChangeEvent,
  type SupabaseClient,
} from '@supabase/supabase-js';

import type { GooglePick } from '@/data/auth/google-account-picker';
import { SupabaseAuthGateway } from '@/data/auth/supabase-auth-gateway';

/** The part of the client the gateway listens to, driven by the test. */
function fakeClient() {
  const listeners = new Set<(event: AuthChangeEvent) => void>();
  const client = {
    auth: {
      onAuthStateChange: (listener: (event: AuthChangeEvent) => void) => {
        listeners.add(listener);
        return { data: { subscription: { unsubscribe: () => listeners.delete(listener) } } };
      },
      signOut: async () => {
        // supabase-js emits SIGNED_OUT also when we sign out ourselves.
        listeners.forEach((listener) => listener('SIGNED_OUT'));
        return { error: null };
      },
    },
  } as unknown as SupabaseClient;
  return {
    gateway: new SupabaseAuthGateway(client, { getItem: async () => null }),
    emit: (event: AuthChangeEvent) => listeners.forEach((listener) => listener(event)),
    listeners,
  };
}

describe('SupabaseAuthGateway.onSessionLost (RF-AUTH-06.AC4)', () => {
  it('tells when the server ends the session (supabase-js emits SIGNED_OUT)', () => {
    const { gateway, emit } = fakeClient();
    const lost = jest.fn();
    gateway.onSessionLost(lost);

    emit('SIGNED_OUT');

    expect(lost).toHaveBeenCalledTimes(1);
  });

  it('ignores the other events, a renewal included', () => {
    const { gateway, emit } = fakeClient();
    const lost = jest.fn();
    gateway.onSessionLost(lost);

    emit('TOKEN_REFRESHED');
    emit('SIGNED_IN');

    expect(lost).not.toHaveBeenCalled();
  });

  it('signing out on purpose is not a loss', async () => {
    const { gateway } = fakeClient();
    const lost = jest.fn();
    gateway.onSessionLost(lost);

    await gateway.signOut();

    expect(lost).not.toHaveBeenCalled();
  });

  it('stops listening when unsubscribed', () => {
    const { gateway, emit, listeners } = fakeClient();
    const stop = gateway.onSessionLost(jest.fn());

    stop();
    emit('SIGNED_OUT');

    expect(listeners.size).toBe(0);
  });
});

const LINK = 'onerm://new-password#access_token=a&refresh_token=r&type=recovery';
const USER = { id: 'u1', email: 'ana@mail.com' };
const OFFLINE = new AuthRetryableFetchError('Network request failed', 0);

/** The client answering the recovery calls with whatever the test says. */
function recoveryGateway(auth: Record<string, unknown>) {
  const client = { auth } as unknown as SupabaseClient;
  return new SupabaseAuthGateway(client, { getItem: async () => null });
}

describe('SupabaseAuthGateway.requestPasswordReset (RF-AUTH-08.AC1)', () => {
  it('asks for the link that opens the app on the new password screen', async () => {
    const resetPasswordForEmail = jest.fn(async () => ({ data: {}, error: null }));
    const gateway = recoveryGateway({ resetPasswordForEmail });

    await expect(gateway.requestPasswordReset('ana@mail.com')).resolves.toBe('sent');

    expect(resetPasswordForEmail).toHaveBeenCalledWith('ana@mail.com', {
      redirectTo: 'onerm://new-password',
    });
  });

  it.each([
    ['offline', OFFLINE],
    ['failed', new Error('boom')],
  ] as const)('«%s» when the call fails', async (status, error) => {
    const gateway = recoveryGateway({
      resetPasswordForEmail: async () => ({ data: null, error }),
    });

    await expect(gateway.requestPasswordReset('ana@mail.com')).resolves.toBe(status);
  });
});

describe('SupabaseAuthGateway.openRecoveryLink (RF-AUTH-08.AC2, AC3)', () => {
  it('AC2: opens the session of the link and says whose it is', async () => {
    const setSession = jest.fn(async () => ({ data: { user: USER, session: {} }, error: null }));
    const gateway = recoveryGateway({ setSession });

    await expect(gateway.openRecoveryLink(LINK)).resolves.toEqual({
      status: 'opened',
      userId: 'u1',
      email: 'ana@mail.com',
    });

    expect(setSession).toHaveBeenCalledWith({ access_token: 'a', refresh_token: 'r' });
  });

  it('AC3: a link that is not a good recovery link never reaches the server', async () => {
    const setSession = jest.fn();
    const gateway = recoveryGateway({ setSession });

    await expect(
      gateway.openRecoveryLink('onerm://new-password#error=access_denied&error_code=otp_expired'),
    ).resolves.toEqual({ status: 'invalidLink' });

    expect(setSession).not.toHaveBeenCalled();
  });

  it('AC3: tokens the server refuses are an invalid link', async () => {
    const gateway = recoveryGateway({
      setSession: async () => ({
        data: { user: null, session: null },
        error: new Error('expired'),
      }),
    });

    await expect(gateway.openRecoveryLink(LINK)).resolves.toEqual({ status: 'invalidLink' });
  });

  it('a session without a user is closed, not left open', async () => {
    const signOut = jest.fn(async () => ({ error: null }));
    const gateway = recoveryGateway({
      setSession: async () => ({ data: { user: null, session: {} }, error: null }),
      signOut,
    });

    await expect(gateway.openRecoveryLink(LINK)).resolves.toEqual({ status: 'invalidLink' });

    expect(signOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  it('says «offline» when there is no connection', async () => {
    const gateway = recoveryGateway({
      setSession: async () => ({ data: { user: null, session: null }, error: OFFLINE }),
    });

    await expect(gateway.openRecoveryLink(LINK)).resolves.toEqual({ status: 'offline' });
  });
});

describe('SupabaseAuthGateway.setNewPassword (RF-AUTH-08.AC2)', () => {
  it('updates the password of the recovery session', async () => {
    const updateUser = jest.fn(async () => ({ data: { user: USER }, error: null }));
    const gateway = recoveryGateway({ updateUser });

    await expect(gateway.setNewPassword('contraseña-nueva')).resolves.toEqual({
      status: 'done',
      userId: 'u1',
    });

    expect(updateUser).toHaveBeenCalledWith({ password: 'contraseña-nueva' });
  });

  it.each([
    ['offline', OFFLINE],
    ['failed', new Error('same_password')],
  ] as const)('«%s» when the call fails', async (status, error) => {
    const gateway = recoveryGateway({
      updateUser: async () => ({ data: { user: null }, error }),
    });

    await expect(gateway.setNewPassword('contraseña-nueva')).resolves.toEqual({ status });
  });
});

/** Google's picker answering what the test says, and the client answering the ID token sign-in. */
function googleGateway(
  pick: GooglePick,
  auth: Record<string, unknown> = {},
  rpc: (name: string, args: unknown) => Promise<{ data: unknown }> = async () => ({ data: null }),
) {
  const picker = { pick: jest.fn(async () => pick), signOut: jest.fn(async () => {}) };
  const client = { auth, rpc } as unknown as SupabaseClient;
  return {
    picker,
    gateway: new SupabaseAuthGateway(client, { getItem: async () => null }, picker),
  };
}

const PICKED: GooglePick = { status: 'picked', idToken: 'google-id-token', email: 'ana@mail.com' };

describe('SupabaseAuthGateway.signInWithGoogle (RF-AUTH-04)', () => {
  it('AC1, AC2: signs in to Supabase with the ID token Google gave', async () => {
    const signInWithIdToken = jest.fn(async () => ({
      data: { user: USER, session: {} },
      error: null,
    }));
    const { gateway } = googleGateway(PICKED, { signInWithIdToken });

    await expect(gateway.signInWithGoogle()).resolves.toEqual({
      status: 'signedIn',
      userId: 'u1',
      email: 'ana@mail.com',
    });

    expect(signInWithIdToken).toHaveBeenCalledWith({
      provider: 'google',
      token: 'google-id-token',
    });
  });

  it("AC4: cancelling Google's screen reaches nothing else", async () => {
    const signInWithIdToken = jest.fn();
    const { gateway } = googleGateway({ status: 'cancelled' }, { signInWithIdToken });

    await expect(gateway.signInWithGoogle()).resolves.toEqual({ status: 'cancelled' });

    expect(signInWithIdToken).not.toHaveBeenCalled();
  });

  it('says «failed» when Google gives no account', async () => {
    const { gateway } = googleGateway({ status: 'failed' });

    await expect(gateway.signInWithGoogle()).resolves.toEqual({ status: 'failed' });
  });

  it('AC5: says «offline» when the server cannot be reached', async () => {
    const { gateway } = googleGateway(PICKED, {
      signInWithIdToken: async () => ({ data: { user: null, session: null }, error: OFFLINE }),
    });

    await expect(gateway.signInWithGoogle()).resolves.toEqual({ status: 'offline' });
  });

  it('AC3, RN-AUTH-03: the email of a password account is told to use its password', async () => {
    const rpc = jest.fn(async () => ({ data: 'email' }));
    const { gateway } = googleGateway(
      PICKED,
      {
        // What GoTrue answers when the trigger refuses the second identity (spike #16).
        signInWithIdToken: async () => ({
          data: { user: null, session: null },
          error: new Error('Error creating identity'),
        }),
      },
      rpc,
    );

    await expect(gateway.signInWithGoogle()).resolves.toEqual({ status: 'useYourPassword' });

    expect(rpc).toHaveBeenCalledWith('sign_in_method_for_email', { p_email: 'ana@mail.com' });
  });

  it('a refused sign-in forgets the Google account, so the picker shows again', async () => {
    const { gateway, picker } = googleGateway(
      PICKED,
      {
        signInWithIdToken: async () => ({
          data: { user: null, session: null },
          error: new Error('Error creating identity'),
        }),
      },
      async () => ({ data: 'email' }),
    );

    await gateway.signInWithGoogle();

    expect(picker.signOut).toHaveBeenCalledTimes(1);
  });

  it('another error is «failed»', async () => {
    const { gateway } = googleGateway(
      PICKED,
      {
        signInWithIdToken: async () => ({
          data: { user: null, session: null },
          error: new Error('boom'),
        }),
      },
      async () => ({ data: null }),
    );

    await expect(gateway.signInWithGoogle()).resolves.toEqual({ status: 'failed' });
  });

  it('without a Google picker configured it cannot continue', async () => {
    const client = { auth: {} } as unknown as SupabaseClient;
    const gateway = new SupabaseAuthGateway(client, { getItem: async () => null });

    await expect(gateway.signInWithGoogle()).resolves.toEqual({ status: 'failed' });
  });

  it('signing out also forgets the Google account, so the picker shows again', async () => {
    const { gateway, picker } = googleGateway(PICKED, {
      signOut: async () => ({ error: null }),
    });

    await gateway.signOut();

    expect(picker.signOut).toHaveBeenCalledTimes(1);
  });
});
