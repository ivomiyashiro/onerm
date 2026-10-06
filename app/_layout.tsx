import { Stack } from 'expo-router';

import { AppProviders } from '@/di/app-providers';
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
        <Stack
          screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bgBase } }}
        >
          <Stack.Screen name="(tabs)" />
          {SHEET_ROUTES.map((name) => (
            <Stack.Screen key={name} name={name} options={SHEET} />
          ))}
        </Stack>
      </StartupGate>
    </AppProviders>
  );
}
