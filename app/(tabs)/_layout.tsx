import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RouterTabBar } from '@/presentation/components/navigation/router-tab-bar';
import type { TabItem } from '@/presentation/components/navigation/tab-bar';
import { navigation } from '@/presentation/strings/navigation';

const TABS: TabItem[] = [
  { key: 'index', label: navigation.tabs.home, icon: 'home' },
  { key: 'routines', label: navigation.tabs.routines, icon: 'list' },
  { key: 'progress', label: navigation.tabs.progress, icon: 'chart' },
  { key: 'profile', label: navigation.tabs.profile, icon: 'user' },
];

/** The 4 tabs of 08 §2; the workout (S09) is a full screen outside them. */
export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      tabBar={(props) => <RouterTabBar tabs={TABS} bottomInset={insets.bottom} {...props} />}
      screenOptions={{ headerShown: false }}
    />
  );
}
