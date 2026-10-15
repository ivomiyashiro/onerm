import {
  AuthRetryableFetchError,
  type AuthChangeEvent,
  type SupabaseClient,
} from '@supabase/supabase-js';

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
