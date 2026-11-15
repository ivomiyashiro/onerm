import { isAllowedServerUrl } from '@/data/auth/server-url';

describe('isAllowedServerUrl (RNF-09)', () => {
  it.each([
    'https://abc.supabase.co',
    'http://localhost',
    'http://localhost:54321',
    'http://127.0.0.1:55321/',
    'http://10.0.2.2:55321',
  ])('accepts %s', (url) => {
    expect(isAllowedServerUrl(url)).toBe(true);
  });

  it.each([
    'http://otro.com',
    'http://localhost.evil.com',
    'http://10.0.2.2.evil.com',
    'ftp://localhost',
  ])('rejects %s', (url) => {
    expect(isAllowedServerUrl(url)).toBe(false);
  });
});
