// Plain CommonJS: Expo only transpiles app.config.ts itself, not the local files it imports.
const { withAppDelegate, withInfoPlist } = require('expo/config-plugins');

// iOS 27 aborts at launch any app that doesn't adopt the scene-based life cycle (#181).
// Expo 57 ships the scene delegate (ExpoAppSceneDelegate, exposed to Objective-C as
// EXExpoAppSceneDelegate) but its prebuild template still uses the app-delegate life cycle.

const PLUGIN = 'with-scene-lifecycle';
const SCENE_DELEGATE = 'EXExpoAppSceneDelegate';

const CLASS_DECLARATION = 'class AppDelegate: ExpoAppDelegate {';
const PROVIDER_DECLARATION = 'class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {';
// The template creates the window and starts React Native into it; the scene delegate does that now.
const WINDOW_START =
  /\n#if os\(iOS\) \|\| os\(tvOS\)\n\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\n\s*factory\.startReactNative\([^)]*\)\n#endif\n/;

/**
 * @template {Record<string, unknown>} T
 * @param {T} infoPlist
 */
function addSceneManifest(infoPlist) {
  return {
    ...infoPlist,
    UIApplicationSceneManifest: {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Default Configuration',
            UISceneDelegateClassName: SCENE_DELEGATE,
          },
        ],
      },
    },
  };
}

/**
 * @param {string} appDelegate
 * @returns {string}
 */
function adoptSceneLifecycle(appDelegate) {
  if (appDelegate.includes(PROVIDER_DECLARATION) && !WINDOW_START.test(appDelegate)) {
    return appDelegate;
  }
  if (!appDelegate.includes(CLASS_DECLARATION) || !WINDOW_START.test(appDelegate)) {
    throw new Error(
      `${PLUGIN}: AppDelegate.swift doesn't match the Expo 57 template; update the plugin.`,
    );
  }
  return appDelegate.replace(CLASS_DECLARATION, PROVIDER_DECLARATION).replace(WINDOW_START, '');
}

/** @type {import('expo/config-plugins').ConfigPlugin} */
const withSceneLifecycle = (config) => {
  config = withInfoPlist(config, (mod) => {
    mod.modResults = addSceneManifest(mod.modResults);
    return mod;
  });
  return withAppDelegate(config, (mod) => {
    if (mod.modResults.language !== 'swift') {
      throw new Error(`${PLUGIN}: only a Swift AppDelegate is supported.`);
    }
    mod.modResults.contents = adoptSceneLifecycle(mod.modResults.contents);
    return mod;
  });
};

module.exports = withSceneLifecycle;
module.exports.addSceneManifest = addSceneManifest;
module.exports.adoptSceneLifecycle = adoptSceneLifecycle;
