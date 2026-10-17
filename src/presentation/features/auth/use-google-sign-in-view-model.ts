import { useRef, useState } from 'react';

import type { ContinueWithGoogleResult } from '@/domain/usecases/continue-with-google';
import { useAfterAuth } from '@/presentation/features/auth/use-after-auth';
import { auth } from '@/presentation/strings/auth';
import { useUseCases } from '@/presentation/use-cases/use-cases-context';

export interface GoogleSignInState {
  /** `working`: Google's screen or the server is busy. `done`: signed in; the screen leaves. */
  status: 'idle' | 'working' | 'done';
  /** Under the form: the email has a password (RN-AUTH-03), no connection, another account. */
  message: string | null;
}

export interface GoogleSignInViewModel {
  /** False without Google's picker on this device: the section isn't shown (D2 of F9). */
  available: boolean;
  state: GoogleSignInState;
  actions: { start(): Promise<void> };
}

const MESSAGE: Record<Exclude<ContinueWithGoogleResult['status'], 'done' | 'cancelled'>, string> = {
  useYourPassword: auth.errors.useYourPassword,
  otherAccount: auth.errors.otherAccount,
  offline: auth.errors.offline(auth.errors.actions.google),
  failed: auth.errors.unexpected,
};

/** «Continuar con Google» of S02 and S03 (RF-AUTH-04). Cancelling says nothing (AC4). */
export function useGoogleSignInViewModel(): GoogleSignInViewModel {
  const { continueWithGoogle } = useUseCases();
  const afterAuth = useAfterAuth();
  const [state, setState] = useState<GoogleSignInState>({ status: 'idle', message: null });
  // A ref, not state: two taps in the same frame must open Google only once.
  const working = useRef(false);

  async function start() {
    if (working.current) return;
    working.current = true;
    setState({ status: 'working', message: null });
    try {
      const result = await continueWithGoogle.execute();
      if (result.status === 'done') {
        await afterAuth(result);
        setState({ status: 'done', message: null });
      } else {
        setState({
          status: 'idle',
          message: result.status === 'cancelled' ? null : MESSAGE[result.status],
        });
      }
    } catch {
      setState({ status: 'idle', message: auth.errors.unexpected });
    } finally {
      working.current = false;
    }
  }

  return { available: continueWithGoogle.available, state, actions: { start } };
}
