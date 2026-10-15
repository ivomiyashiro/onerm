import { useRef, useState } from 'react';

import type { SignInResult } from '@/domain/usecases/sign-in';
import { useUseCases } from '@/presentation/use-cases/use-cases-context';
import { auth } from '@/presentation/strings/auth';

export interface SignInState {
  /** `done`: signed in; the screen leaves. */
  status: 'editing' | 'submitting' | 'done';
  email: string;
  password: string;
  showPassword: boolean;
  emailError: string | null;
  /** Under the form: wrong credentials, no connection, another account (RN-AUTH-07). */
  message: string | null;
  canSubmit: boolean;
}

export interface SignInViewModel {
  state: SignInState;
  actions: {
    setEmail(email: string): void;
    setPassword(password: string): void;
    toggleShowPassword(): void;
    submit(): Promise<void>;
  };
}

const MESSAGE: Record<Exclude<SignInResult['status'], 'invalid' | 'done'>, string> = {
  wrongCredentials: auth.errors.wrongCredentials,
  offline: auth.errors.offline('iniciar sesión'),
  otherAccount: auth.errors.otherAccount,
  failed: auth.errors.unexpected,
};

/** S02 · Iniciar sesión (RF-AUTH-03). `initialEmail` comes from S03 when the email is taken. */
export function useSignInViewModel(initialEmail = ''): SignInViewModel {
  const { signIn, continueAfterAuth } = useUseCases();
  const [form, setForm] = useState({
    email: initialEmail,
    password: '',
    showPassword: false,
    status: 'editing' as SignInState['status'],
    emailError: null as string | null,
    message: null as string | null,
  });
  // A ref, not state: two taps in the same frame must send only once.
  const sending = useRef(false);

  async function submit() {
    if (sending.current || form.email.trim() === '' || form.password === '') return;
    sending.current = true;
    setForm((f) => ({ ...f, status: 'submitting', emailError: null, message: null }));
    try {
      const result = await signIn.execute({ email: form.email, password: form.password });
      if (result.status === 'invalid') {
        setForm((f) => ({
          ...f,
          status: 'editing',
          emailError:
            result.email === 'missingDomain'
              ? auth.form.emailMissingDomain
              : auth.form.emailInvalid,
        }));
      } else if (result.status === 'done') {
        await continueAfterAuth.execute().catch(() => undefined);
        setForm((f) => ({ ...f, status: 'done' }));
      } else {
        setForm((f) => ({ ...f, status: 'editing', message: MESSAGE[result.status] }));
      }
    } catch {
      setForm((f) => ({ ...f, status: 'editing', message: auth.errors.unexpected }));
    } finally {
      sending.current = false;
    }
  }

  return {
    state: {
      status: form.status,
      email: form.email,
      password: form.password,
      showPassword: form.showPassword,
      emailError: form.emailError,
      message: form.message,
      canSubmit: form.email.trim() !== '' && form.password !== '',
    },
    actions: {
      setEmail: (email) => setForm((f) => ({ ...f, email, emailError: null })),
      setPassword: (password) => setForm((f) => ({ ...f, password })),
      toggleShowPassword: () => setForm((f) => ({ ...f, showPassword: !f.showPassword })),
      submit,
    },
  };
}
