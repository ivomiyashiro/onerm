import { Stack } from 'expo-router';

import { AppProviders } from '@/di/app-providers';
import { EntryGate } from '@/presentation/features/entry/entry-gate';
import { StartupGate } from '@/presentation/features/startup/startup-gate';
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
    <AppProviders>
      {/* The screens mount once the local database is migrated (07 §6). */}
      <StartupGate>
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
              <Stack.Protected guard={entry.kind === 'welcome'}>
                <Stack.Screen name="welcome" />
              </Stack.Protected>
              <Stack.Protected
                guard={entry.kind === 'onboarding' && entry.step !== 'recommendation'}
              >
                <Stack.Screen name="onboarding" />
              </Stack.Protected>
              <Stack.Protected
                guard={entry.kind === 'onboarding' && entry.step === 'recommendation'}
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
  );
}
