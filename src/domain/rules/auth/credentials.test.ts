import { emailProblem, passwordProblem } from '@/domain/rules/auth/credentials';

describe('credentials (RF-AUTH-02.AC2, RN-AUTH-01)', () => {
  it.each(['ana@mail.com', 'a.b+c@sub.dominio.com.ar'])('accepts the email %s', (email) => {
    expect(emailProblem(email)).toBeNull();
  });

  it('ignores the spaces around the email', () => {
    expect(emailProblem('  ana@mail.com ')).toBeNull();
  });

  it.each(['', 'ana', 'ana@', '@mail.com', 'a na@mail.com', 'ana@@mail.com'])(
    'rejects the email "%s" as malformed',
    (email) => {
      expect(emailProblem(email)).toBe('format');
    },
  );

  it.each(['ana@mail', 'ana@localhost'])('points out the missing domain in "%s"', (email) => {
    expect(emailProblem(email)).toBe('missingDomain');
  });

  it('RN-AUTH-01: the password needs at least 8 characters and nothing else', () => {
    expect(passwordProblem('1234567')).toBe('tooShort');
    expect(passwordProblem('12345678')).toBeNull();
    expect(passwordProblem('contraseña larga con espacios')).toBeNull();
  });

  it('counts characters, not bytes', () => {
    expect(passwordProblem('ñññññññ')).toBe('tooShort');
    expect(passwordProblem('ññññññññ')).toBeNull();
  });
});
