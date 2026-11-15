import { AppState, Platform } from 'react-native';

import {
  createSupabaseAuth,
  UnconfiguredAuthGateway,
  type SupabaseAuth,
} from '@/data/auth/create-supabase-auth';
import { expoSessionStorage } from '@/data/auth/expo-session-storage';
import { NativeGoogleAccountPicker } from '@/data/auth/google-account-picker';
import type { AuthGateway } from '@/domain/services/auth-gateway';

/**
 * Supabase Auth with the session sealed in the Keystore (RNF-07). The server comes from the build's
 * public variables; without them nothing can sign in. The token only refreshes with the app in
 * the foreground, as supabase-js recommends for React Native (spike #15).
 */
export function appAuth(): AuthGateway {
  return appSupabase()?.gateway ?? new UnconfiguredAuthGateway();
}

/** One supabase-js client for auth and sync (spike #15), or null without a server configured. */
export function appSupabase(): SupabaseAuth | null {
  if (cachedSupabase === undefined) cachedSupabase = createAppSupabase();
  return cachedSupabase;
}

let cachedSupabase: SupabaseAuth | null | undefined;

/**
 * The WEB client of Google (spike #16): public by design, it goes inside the app. It is also the
 * `client_id` of the Google provider in Supabase.
 */
const GOOGLE_WEB_CLIENT_ID =
  '190800915067-rcghu8e9tmhjam3mrqra4g5mbdbibb3s.apps.googleusercontent.com';

/**
 * iOS needs its own Google client (ADR-0012), and without it `configure` throws at startup (#49).
 * Until one is created, iOS has no Google picker: «Continuar con Google» fails like an error.
 */
function googlePicker(): NativeGoogleAccountPicker | undefined {
  if (Platform.OS !== 'ios')
    return new NativeGoogleAccountPicker({ webClientId: GOOGLE_WEB_CLIENT_ID });
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  return iosClientId
    ? new NativeGoogleAccountPicker({ webClientId: GOOGLE_WEB_CLIENT_ID, iosClientId })
    : undefined;
}

/** The server has to be reached over https (RNF-09); plain http only for the dev machine. */
const LOCAL_HOST = /^http:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2)(:|\/|$)/;

/** Whether the app may talk to the server at `url` (RNF-09). */
export function isAllowedServerUrl(url: string): boolean {
  return url.startsWith('https://') || LOCAL_HOST.test(url);
}

function createAppSupabase(): SupabaseAuth | null {
  // Read literally: Expo inlines `process.env.EXPO_PUBLIC_*` at build time, and only in this form.
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) return null;
  if (!isAllowedServerUrl(url)) return null;

  const supabase = createSupabaseAuth({
    url,
    publishableKey,
    storage: expoSessionStorage,
    google: googlePicker(),
  });
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.client.auth.startAutoRefresh();
    else supabase.client.auth.stopAutoRefresh();
  });
  return supabase;
}
