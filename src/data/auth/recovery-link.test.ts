import { parseRecoveryLink } from '@/data/auth/recovery-link';

describe('parseRecoveryLink (RF-AUTH-08.AC2, AC3)', () => {
  it('reads the tokens of a recovery link', () => {
    expect(
      parseRecoveryLink('onerm://new-password#access_token=a.b.c&refresh_token=r1&type=recovery'),
    ).toEqual({ accessToken: 'a.b.c', refreshToken: 'r1' });
  });

  it.each([
    [
      'an expired or used link (the server sends the error)',
      'onerm://new-password#error=access_denied&error_code=otp_expired',
    ],
    ['another kind of link', 'onerm://new-password#access_token=a&refresh_token=r&type=signup'],
    ['a link without tokens', 'onerm://new-password'],
    ['a link with only one token', 'onerm://new-password#access_token=a&type=recovery'],
    ['something that is not a link', 'hola'],
  ])('%s is not valid', (_name, url) => {
    expect(parseRecoveryLink(url)).toBeNull();
  });
});
