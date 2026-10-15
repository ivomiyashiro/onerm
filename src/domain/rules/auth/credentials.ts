/** RN-AUTH-01: the password length, nothing else (NIST SP 800-63B: length before composition). */
export const PASSWORD_MIN_LENGTH = 8;

export type EmailProblem = 'format' | 'missingDomain';
export type PasswordProblem = 'tooShort';

const NO_SPACES_OR_AT = /^[^\s@]+$/;

/**
 * RF-AUTH-02.AC2: a quick check before sending, not a full RFC one (the server decides). A name,
 * one «@» and a host; the host needs a dot, otherwise the person probably forgot the «.com».
 */
export function emailProblem(email: string): EmailProblem | null {
  const parts = email.trim().split('@');
  if (parts.length !== 2) return 'format';
  const [name, host] = parts;
  if (!NO_SPACES_OR_AT.test(name) || !NO_SPACES_OR_AT.test(host)) return 'format';
  return host.includes('.') ? null : 'missingDomain';
}

export function passwordProblem(password: string): PasswordProblem | null {
  return [...password].length < PASSWORD_MIN_LENGTH ? 'tooShort' : null;
}
