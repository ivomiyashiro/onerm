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
  },
  android: {
    package: 'com.training.onerm',
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  plugins: [
    'expo-router',
    // Embeds the fonts in the native build: no async loading or blank first frame.
    [
      'expo-font',
      {
        fonts: [
          './assets/fonts/Archivo-Regular.ttf',
          './assets/fonts/Archivo-Medium.ttf',
          './assets/fonts/Archivo-SemiBold.ttf',
          './assets/fonts/Archivo-Bold.ttf',
          './assets/fonts/Archivo-ExtraBold.ttf',
          './assets/fonts/ArchivoCondensed-Bold.ttf',
          './assets/fonts/ArchivoExpanded-ExtraBold.ttf',
          './assets/fonts/JetBrainsMono-Bold.ttf',
        ],
      },
    ],
    [
      'expo-splash-screen',
      {
        backgroundColor: '#208AEF',
        image: './assets/images/splash-icon.png',
        imageWidth: 76,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
};

export default config;
