import { useCallback, useEffect, useRef, useState } from 'react';

import type { OpenRecoveryLinkResult } from '@/domain/usecases/open-recovery-link';
import { auth } from '@/presentation/strings/auth';
import { useAfterAuth } from '@/presentation/features/auth/use-after-auth';
import { useUseCases } from '@/presentation/use-cases/use-cases-context';

export interface NewPasswordState {
  /**
   * `checking`: opening the link. `invalidLink`: expired or used (AC3). `unavailable`: it could
   * not be opened (no connection, another account's, an error): `message` says why. `done`: the
   * screen leaves.
   */
  status: 'checking' | 'invalidLink' | 'unavailable' | 'editing' | 'saving' | 'done';
  password: string;
  showPassword: boolean;
  passwordError: string | null;
  message: string | null;
  canSubmit: boolean;
}

export interface NewPasswordViewModel {
  state: NewPasswordState;
  actions: {
    setPassword(password: string): void;
    toggleShowPassword(): void;
    submit(): Promise<void>;
    /** The person leaves the screen: a recovery session that wasn't used must not stay open. */
    leave(): Promise<void>;
  };
}

const OPEN_FAILED: Record<'offline' | 'otherAccount' | 'failed', string> = {
  offline: auth.errors.offline(auth.errors.actions.resetPassword),
  otherAccount: auth.errors.otherAccount,
  failed: auth.errors.unexpected,
};

/** S24 · Nueva contraseña (RF-AUTH-08.AC2, AC3). `url` is the link that opened the app. */
export function useNewPasswordViewModel(url: string | null): NewPasswordViewModel {
  const { openRecoveryLink, completePasswordRecovery } = useUseCases();
  const afterAuth = useAfterAuth();
  const [form, setForm] = useState({
    status: 'checking' as NewPasswordState['status'],
    password: '',
    showPassword: false,
    passwordError: null as string | null,
    message: null as string | null,
  });
  const email = useRef<string | null>(null);
  const opened = useRef<string | null>(null);
  const saving = useRef(false);
  // Whether a recovery session is open and not used yet.
  const sessionOpen = useRef(false);

  useEffect(() => {
    // Each link is opened once: it can only be used once.
    if (url === null || opened.current === url) return;
    opened.current = url;
    let active = true;
    setForm((f) => (f.status === 'checking' ? f : { ...f, status: 'checking', message: null }));
    openRecoveryLink.execute({ url }).then(
      (result: OpenRecoveryLinkResult) => {
        if (!active) return;
        if (result.status === 'ready') {
          email.current = result.email;
          // Already in this account: leaving without saving must not end that session.
          sessionOpen.current = !result.alreadyIn;
          setForm((f) => ({ ...f, status: 'editing' }));
        } else if (result.status === 'invalidLink') {
          setForm((f) => ({ ...f, status: 'invalidLink' }));
        } else {
          setForm((f) => ({ ...f, status: 'unavailable', message: OPEN_FAILED[result.status] }));
        }
      },
      () => {
        if (active)
          setForm((f) => ({ ...f, status: 'unavailable', message: auth.errors.unexpected }));
      },
    );
    return () => {
      active = false;
    };
  }, [url, openRecoveryLink]);

  async function submit() {
    if (saving.current || form.status !== 'editing' || form.password === '') return;
    saving.current = true;
    setForm((f) => ({ ...f, status: 'saving', passwordError: null, message: null }));
    try {
      const result = await completePasswordRecovery.execute({ password: form.password });
      if (result.status === 'done') {
        sessionOpen.current = false;
        await afterAuth({ ...result, email: email.current });
        setForm((f) => ({ ...f, status: 'done' }));
      } else if (result.status === 'invalid') {
        setForm((f) => ({ ...f, status: 'editing', passwordError: auth.form.passwordTooShort }));
      } else if (result.status === 'otherAccount') {
        sessionOpen.current = false;
        setForm((f) => ({ ...f, status: 'unavailable', message: OPEN_FAILED.otherAccount }));
      } else {
        setForm((f) => ({
          ...f,
          status: 'editing',
          message: result.status === 'offline' ? OPEN_FAILED.offline : OPEN_FAILED.failed,
        }));
      }
    } catch {
      setForm((f) => ({ ...f, status: 'editing', message: auth.errors.unexpected }));
    } finally {
      saving.current = false;
    }
  }

  // Stable: the screen runs it when it unmounts.
  const leave = useCallback(async () => {
    if (!sessionOpen.current) return;
    sessionOpen.current = false;
    await completePasswordRecovery.cancel().catch(() => undefined);
  }, [completePasswordRecovery]);

  return {
    state: {
      status: form.status,
      password: form.password,
      showPassword: form.showPassword,
      passwordError: form.passwordError,
      message: form.message,
      canSubmit: form.status === 'editing' && form.password !== '',
    },
    actions: {
      setPassword: (password) => setForm((f) => ({ ...f, password, passwordError: null })),
      toggleShowPassword: () => setForm((f) => ({ ...f, showPassword: !f.showPassword })),
      submit,
      leave,
    },
  };
}
