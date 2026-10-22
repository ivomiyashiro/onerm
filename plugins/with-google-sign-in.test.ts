import { googleSignInPlugin } from './with-google-sign-in';

describe('googleSignInPlugin (#273, ADR-0012)', () => {
  it('registers the reversed iOS client ID as the URL scheme Google returns to', () => {
    expect(googleSignInPlugin('190800915067-abc123.apps.googleusercontent.com')).toEqual([
      '@react-native-google-signin/google-signin',
      { iosUrlScheme: 'com.googleusercontent.apps.190800915067-abc123' },
    ]);
  });

  it('ignores the spaces around the value, as a line of .env.local may have', () => {
    expect(googleSignInPlugin(' 190800915067-abc123.apps.googleusercontent.com\n')).toEqual([
      '@react-native-google-signin/google-signin',
      { iosUrlScheme: 'com.googleusercontent.apps.190800915067-abc123' },
    ]);
  });

  it('without an iOS client ID, adds the plugin as before: iOS offers no Google', () => {
    expect(googleSignInPlugin(undefined)).toBe('@react-native-google-signin/google-signin');
    expect(googleSignInPlugin(' ')).toBe('@react-native-google-signin/google-signin');
  });

  it.each([
    'com.googleusercontent.apps.190800915067-abc123',
    '190800915067/abc.apps.googleusercontent.com',
  ])('refuses %s, which is not a Google client ID, without printing it', (value) => {
    expect(() => googleSignInPlugin(value)).toThrow('EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID');
    expect(() => googleSignInPlugin(value)).not.toThrow(value);
  });
});
