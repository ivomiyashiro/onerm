import { Stack } from 'expo-router';

import { AppProviders } from '@/di/app-providers';
import { colors } from '@/presentation/theme';

// S08, S10 and S11 are sheets: the router shows them over the current screen, which stays
// visible behind the scrim.
const SHEET = {
  presentation: 'transparentModal',
  animation: 'fade',
  contentStyle: { backgroundColor: 'transparent' },
} as const;

export default function RootLayout() {
  return (
    <AppProviders>
      <Stack
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bgBase } }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="choose-day" options={SHEET} />
        <Stack.Screen name="suggestion-reason" options={SHEET} />
        <Stack.Screen name="substitute-exercise" options={SHEET} />
      </Stack>
    </AppProviders>
  );
}
