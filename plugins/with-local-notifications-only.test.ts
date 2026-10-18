import { dropPushEntitlement } from './with-local-notifications-only';

describe('dropPushEntitlement (#217)', () => {
  it('removes the push entitlement that expo-notifications adds and keeps the other keys', () => {
    const entitlements = dropPushEntitlement({
      'aps-environment': 'development',
      'com.apple.developer.applesignin': ['Default'],
    });

    expect(entitlements).toEqual({ 'com.apple.developer.applesignin': ['Default'] });
  });
});
