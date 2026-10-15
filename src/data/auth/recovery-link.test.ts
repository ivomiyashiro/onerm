import { parseRecoveryLink, recoveryLinkUserId } from '@/data/auth/recovery-link';

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

/** A token with that payload: only the middle part matters here. */
const tokenFor = (claims: object) =>
  `e30.${btoa(JSON.stringify(claims)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')}.firma`;
const linkWith = (token: string) =>
  `onerm://new-password#access_token=${token}&refresh_token=r&type=recovery`;

describe('recoveryLinkUserId (RN-AUTH-07)', () => {
  it('reads the account of the link from its access token', () => {
    expect(recoveryLinkUserId(linkWith(tokenFor({ sub: 'u1', email: 'ánä@mail.com' })))).toBe('u1');
  });

  it.each([
    ['a token that is not a JWT', linkWith('nada')],
    ['a token without sub', linkWith(tokenFor({ email: 'a@b.c' }))],
    ['a payload that is not JSON', linkWith('e30.%%%.x')],
    ['not a recovery link', 'onerm://new-password'],
  ])('%s gives nothing', (_name, url) => {
    expect(recoveryLinkUserId(url)).toBeNull();
  });
});
