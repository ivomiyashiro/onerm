import { Tabs, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RouterTabBar } from '@/presentation/components/navigation/router-tab-bar';
import type { TabItem } from '@/presentation/components/navigation/tab-bar';
import { useTabAction } from '@/presentation/features/workout/use-tab-action';
import { WorkoutResumeDialog } from '@/presentation/features/workout/workout-resume-dialog';
import { navigation } from '@/presentation/strings/navigation';

const TABS: TabItem[] = [
  { key: 'index', label: navigation.tabs.home, icon: 'home' },
  { key: 'routines', label: navigation.tabs.routines, icon: 'list' },
  { key: 'progress', label: navigation.tabs.progress, icon: 'chart' },
  { key: 'profile', label: navigation.tabs.profile, icon: 'user' },
];

/**
 * The 4 tabs of 08 §2 with the central button (Empezar / Continuar); the workout (S09) is a full
 * screen outside them.
 */
export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const action = useTabAction(() => router.push('/workout'));
  return (
    <>
      <Tabs
        tabBar={(props) => (
          <RouterTabBar tabs={TABS} action={action} bottomInset={insets.bottom} {...props} />
        )}
        screenOptions={{ headerShown: false }}
      />
      {/* RF-ENT-13: the tabs mount once per app start, so this runs on opening the app. */}
      <WorkoutResumeDialog
        onResume={() => router.push('/workout')}
        onFinished={(id) => router.push({ pathname: '/workout-summary', params: { id } })}
      />
    </>
  );
}
