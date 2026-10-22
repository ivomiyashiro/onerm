import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'OneRM',
  slug: 'onerm',
  scheme: 'onerm',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: 'com.training.onerm',
    // marca §16: iOS 18+ picks the variant for the home screen's look (light, dark or tinted).
    icon: {
      light: './assets/images/icon.png',
      dark: './assets/images/icon-dark.png',
      tinted: './assets/images/icon-tinted.png',
    },
  },
  android: {
    package: 'com.training.onerm',
    adaptiveIcon: {
      backgroundColor: '#0E0E0D',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  plugins: [
    'expo-router',
    // Native Google sign-in, with the iOS URL scheme when there is an iOS client (#273).
    './plugins/with-google-sign-in',
    // Embeds the fonts in the native build: no async loading or blank first frame.
    [
      'expo-font',
      {
        fonts: [
          './assets/fonts/Geist-Regular.ttf',
          './assets/fonts/Geist-Medium.ttf',
          './assets/fonts/Geist-SemiBold.ttf',
          './assets/fonts/Geist-Bold.ttf',
          './assets/fonts/Geist-ExtraBold.ttf',
          './assets/fonts/ArchivoCondensed-Bold.ttf',
          './assets/fonts/ArchivoExpanded-ExtraBold.ttf',
          './assets/fonts/JetBrainsMono-Bold.ttf',
        ],
      },
    ],
    [
      'expo-splash-screen',
      // marca §16: bg/base and the mark at 96 dp; the JS splash (launch-splash.tsx) starts from
      // this same frame, so both values must match it.
      // The app is dark only, so the system's dark mode shows the same splash.
      {
        backgroundColor: '#0E0E0D',
        image: './assets/images/splash-icon.png',
        imageWidth: 96,
        dark: { backgroundColor: '#0E0E0D', image: './assets/images/splash-icon.png' },
      },
    ],
    // iOS 27 requires the scene-based life cycle; without it the app closes at launch (#181).
    './plugins/with-scene-lifecycle',
    // Local notifications only: a personal Apple team can't sign the push entitlement (#217).
    './plugins/with-local-notifications-only',
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
};

export default config;
