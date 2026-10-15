import { pickError } from '@/data/auth/google-account-picker';

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: { configure: jest.fn() },
  isCancelledResponse: jest.fn(),
  isErrorWithCode: (error: unknown) =>
    typeof error === 'object' && error !== null && 'code' in error,
  statusCodes: { SIGN_IN_CANCELLED: '12501' },
}));

const withCode = (code: string) => Object.assign(new Error(code), { code });

describe('pickError (RF-AUTH-04)', () => {
  it('AC5: no network to reach Google is «offline»', () => {
    expect(pickError(withCode('7'))).toEqual({ status: 'offline' });
  });

  it("AC4: closing Google's screen is «cancelled»", () => {
    expect(pickError(withCode('12501'))).toEqual({ status: 'cancelled' });
  });

  it('anything else is «failed»', () => {
    expect(pickError(withCode('10'))).toEqual({ status: 'failed' });
    expect(pickError(new Error('boom'))).toEqual({ status: 'failed' });
  });
});
