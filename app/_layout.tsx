import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AppProviders } from '@/di/app-providers';
import { SessionWatcher } from '@/presentation/features/auth/session-watcher';
import { EntryGate } from '@/presentation/features/entry/entry-gate';
import { StartupGate } from '@/presentation/features/startup/startup-gate';
import { SyncWatcher } from '@/presentation/features/sync/sync-watcher';
import { SCREEN_IDS, screenRoutes } from '@/presentation/features/dev/screen-routes';
import { colors } from '@/presentation/theme';

// S08, S10 and S11 are sheets: the router shows them over the current screen, which stays
// visible behind the scrim.
const SHEET = {
  presentation: 'transparentModal',
  animation: 'fade',
  contentStyle: { backgroundColor: 'transparent' },
} as const;

// The sheets are marked in the screen map, so the list lives in one place ("/choose-day" → "choose-day").
const SHEET_ROUTES = SCREEN_IDS.filter((id) => screenRoutes[id].sheet).map((id) =>
  screenRoutes[id].pathname.slice(1),
);

export default function RootLayout() {
  return (
    // Gestures (the drag of S15) need a root view over the whole app.
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppProviders>
        {/* The screens mount once the local database is migrated (07 §6). */}
        <StartupGate>
          <SessionWatcher />
          <SyncWatcher />
          <EntryGate>
            {(entry) => (
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: colors.bgBase },
                }}
              >
                {/* 08 §3: only the stage's screens exist, so each answer that is saved moves the
                  app to the next one; the first available screen is where it opens. */}
                <Stack.Protected guard={entry.kind === 'app'}>
                  <Stack.Screen name="(tabs)" />
                </Stack.Protected>
                {/* S23: an account's device without its profile yet (RF-SYNC-03). */}
                <Stack.Protected guard={entry.kind === 'restoring'}>
                  <Stack.Screen name="restoring" />
                </Stack.Protected>
                <Stack.Protected guard={entry.kind === 'welcome'}>
                  <Stack.Screen name="welcome" />
                </Stack.Protected>
                <Stack.Protected
                  guard={entry.kind === 'onboarding' && entry.step !== 'recommendation'}
                >
                  <Stack.Screen name="onboarding" />
                </Stack.Protected>
                {/* S06 stays while its choice ends the onboarding, so it can navigate after. */}
                <Stack.Protected
                  guard={
                    entry.kind === 'app' ||
                    (entry.kind === 'onboarding' && entry.step === 'recommendation')
                  }
                >
                  <Stack.Screen name="recommendation" />
                </Stack.Protected>
                {SHEET_ROUTES.map((name) => (
                  <Stack.Screen key={name} name={name} options={SHEET} />
                ))}
              </Stack>
            )}
          </EntryGate>
        </StartupGate>
      </AppProviders>
    </GestureHandlerRootView>
  );
}
