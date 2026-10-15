import { useRef, useState } from 'react';

import type { SignUpResult } from '@/domain/usecases/sign-up';
import { auth } from '@/presentation/strings/auth';
import { useAppStore } from '@/presentation/state/app-store-context';
import { useUseCases } from '@/presentation/use-cases/use-cases-context';

export interface SignUpState {
  status: 'editing' | 'submitting' | 'done';
  email: string;
  password: string;
  showPassword: boolean;
  emailError: string | null;
  passwordError: string | null;
  /** Under the form: no connection, an email of a Google account, another account. */
  message: string | null;
  /** RF-AUTH-02.AC3: offers to sign in with the email already filled in. */
  emailTaken: boolean;
  canSubmit: boolean;
}

export interface SignUpViewModel {
  state: SignUpState;
  actions: {
    setEmail(email: string): void;
    setPassword(password: string): void;
    toggleShowPassword(): void;
    submit(): Promise<void>;
  };
}

/** S03 · Crear cuenta (RF-AUTH-02). What was typed is kept when something fails (AC4). */
export function useSignUpViewModel(): SignUpViewModel {
  const { signUp, continueAfterAuth } = useUseCases();
  const setAccount = useAppStore((s) => s.setAccount);
  const [form, setForm] = useState({
    email: '',
    password: '',
    showPassword: false,
    status: 'editing' as SignUpState['status'],
    emailError: null as string | null,
    passwordError: null as string | null,
    message: null as string | null,
    emailTaken: false,
  });
  const sending = useRef(false);

  function failed(result: Exclude<SignUpResult, { status: 'done' }>) {
    const base = {
      status: 'editing' as const,
      emailError: null,
      passwordError: null,
      message: null,
      emailTaken: false,
    };
    switch (result.status) {
      case 'invalid':
        return {
          ...base,
          emailError:
            result.email === null
              ? null
              : result.email === 'missingDomain'
                ? auth.form.emailMissingDomain
                : auth.form.emailInvalid,
          passwordError: result.password === null ? null : auth.form.passwordTooShort,
        };
      case 'emailTaken':
        return { ...base, message: auth.errors.emailTaken, emailTaken: true };
      case 'useGoogle':
        return { ...base, message: auth.errors.useGoogle };
      case 'otherAccount':
        return { ...base, message: auth.errors.otherAccount };
      case 'offline':
        return { ...base, message: auth.errors.offline(auth.errors.actions.signUp) };
      case 'failed':
        return { ...base, message: auth.errors.unexpected };
    }
  }

  async function submit() {
    if (sending.current || form.email.trim() === '' || form.password === '') return;
    sending.current = true;
    setForm((f) => ({ ...f, status: 'submitting' }));
    try {
      const result = await signUp.execute({ email: form.email, password: form.password });
      if (result.status === 'done') {
        setAccount({
          kind: 'user',
          userId: result.userId,
          email: form.email.trim(),
          sessionExpired: false,
        });
        await continueAfterAuth.execute().catch(() => undefined);
        setForm((f) => ({ ...f, status: 'done' }));
      } else {
        setForm((f) => ({ ...f, ...failed(result) }));
      }
    } catch {
      setForm((f) => ({ ...f, ...failed({ status: 'failed' }) }));
    } finally {
      sending.current = false;
    }
  }

  return {
    state: {
      ...form,
      canSubmit: form.email.trim() !== '' && form.password !== '',
    },
    actions: {
      setEmail: (email) =>
        setForm((f) => ({ ...f, email, emailError: null, emailTaken: false, message: null })),
      setPassword: (password) => setForm((f) => ({ ...f, password, passwordError: null })),
      toggleShowPassword: () => setForm((f) => ({ ...f, showPassword: !f.showPassword })),
      submit,
    },
  };
}
