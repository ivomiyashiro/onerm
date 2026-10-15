import { useRef, useState } from 'react';

import { auth } from '@/presentation/strings/auth';
import { useUseCases } from '@/presentation/use-cases/use-cases-context';

export interface PasswordRecoveryState {
  /** `sent`: «Revisá tu correo». */
  status: 'editing' | 'sending' | 'sent';
  email: string;
  emailError: string | null;
  /** Under the form: no connection, or another error. */
  message: string | null;
  canSubmit: boolean;
}

export interface PasswordRecoveryViewModel {
  state: PasswordRecoveryState;
  actions: {
    setEmail(email: string): void;
    submit(): Promise<void>;
  };
}

/** S04 · Recuperar contraseña (RF-AUTH-08.AC1). `initialEmail` comes from S02. */
export function usePasswordRecoveryViewModel(initialEmail = ''): PasswordRecoveryViewModel {
  const { requestPasswordReset } = useUseCases();
  const [form, setForm] = useState({
    email: initialEmail,
    status: 'editing' as PasswordRecoveryState['status'],
    emailError: null as string | null,
    message: null as string | null,
  });
  // A ref, not state: two taps in the same frame must send only one email.
  const sending = useRef(false);

  async function submit() {
    if (sending.current || form.email.trim() === '') return;
    sending.current = true;
    setForm((f) => ({ ...f, status: 'sending', emailError: null, message: null }));
    try {
      const result = await requestPasswordReset.execute({ email: form.email });
      setForm((f) => {
        switch (result.status) {
          case 'sent':
            return { ...f, status: 'sent' };
          case 'invalid':
            return {
              ...f,
              status: 'editing',
              emailError:
                result.email === 'missingDomain'
                  ? auth.form.emailMissingDomain
                  : auth.form.emailInvalid,
            };
          case 'offline':
            return {
              ...f,
              status: 'editing',
              message: auth.errors.offline(auth.errors.actions.resetPassword),
            };
          case 'failed':
            return { ...f, status: 'editing', message: auth.errors.unexpected };
        }
      });
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
      emailError: form.emailError,
      message: form.message,
      canSubmit: form.email.trim() !== '',
    },
    actions: {
      setEmail: (email) => setForm((f) => ({ ...f, email, emailError: null })),
      submit,
    },
  };
}
