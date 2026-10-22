import { type ConfigPlugin, withPlugins } from 'expo/config-plugins';

// Native Google sign-in (RF-AUTH-04, spike #16). On iOS, Google returns to the app through a URL
// scheme that is the reversed iOS client ID; without it, opening the picker crashes the app.
// The client ID is public like the web one (ADR-0012). Without it, iOS offers no Google (#49).

const PLUGIN = '@react-native-google-signin/google-signin';
const CLIENT_ID = /^(.+)\.apps\.googleusercontent\.com$/;

export function googleSignInPlugin(
  iosClientId: string | undefined,
): typeof PLUGIN | [typeof PLUGIN, { iosUrlScheme: string }] {
  if (!iosClientId) return PLUGIN;
  const id = CLIENT_ID.exec(iosClientId)?.[1];
  if (id === undefined) {
    throw new Error(
      `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID must be a Google client ID (…apps.googleusercontent.com), got «${iosClientId}».`,
    );
  }
  return [PLUGIN, { iosUrlScheme: `com.googleusercontent.apps.${id}` }];
}

const withGoogleSignIn: ConfigPlugin = (config) =>
  withPlugins(config, [googleSignInPlugin(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID)]);

export default withGoogleSignIn;
