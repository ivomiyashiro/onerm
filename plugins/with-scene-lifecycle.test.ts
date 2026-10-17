import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { addSceneManifest, adoptSceneLifecycle } from './with-scene-lifecycle';

// The AppDelegate.swift that `expo prebuild` generates with Expo SDK 57 (expo-template-bare-minimum).
const templateAppDelegate = readFileSync(
  join(__dirname, 'fixtures/expo-57-app-delegate.swift'),
  'utf8',
);

describe('addSceneManifest (#181)', () => {
  it('declares a single scene handled by the Expo scene delegate and keeps the other keys', () => {
    const plist = addSceneManifest({ CFBundleDisplayName: 'OneRM' });

    expect(plist).toEqual({
      CFBundleDisplayName: 'OneRM',
      UIApplicationSceneManifest: {
        UIApplicationSupportsMultipleScenes: false,
        UISceneConfigurations: {
          UIWindowSceneSessionRoleApplication: [
            {
              UISceneConfigurationName: 'Default Configuration',
              UISceneDelegateClassName: 'EXExpoAppSceneDelegate',
            },
          ],
        },
      },
    });
  });
});

describe('adoptSceneLifecycle (#181)', () => {
  it('makes the AppDelegate a factory provider that no longer creates the window', () => {
    const appDelegate = adoptSceneLifecycle(templateAppDelegate);

    expect(appDelegate).toContain(
      'class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {',
    );
    expect(appDelegate).not.toContain('UIWindow(frame:');
    expect(appDelegate).not.toContain('factory.startReactNative(');
    // The factory is still created at launch: the scene delegate reads it.
    expect(appDelegate).toContain('reactNativeFactory = factory');
  });

  it('is idempotent, so running prebuild again leaves the file as it is', () => {
    const once = adoptSceneLifecycle(templateAppDelegate);

    expect(adoptSceneLifecycle(once)).toBe(once);
  });

  it('fails loudly when the template changed instead of writing a broken AppDelegate', () => {
    expect(() => adoptSceneLifecycle('class AppDelegate: SomethingElse {}')).toThrow(
      /with-scene-lifecycle/,
    );
  });
});
