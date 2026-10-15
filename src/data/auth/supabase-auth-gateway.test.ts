import type { AuthChangeEvent, SupabaseClient } from '@supabase/supabase-js';

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
