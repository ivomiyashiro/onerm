import { Tabs } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TabBar, type TabItem } from '@/presentation/components/navigation/tab-bar';
import { navigation } from '@/presentation/strings/navigation';

const TABS: TabItem[] = [
  { key: 'index', label: navigation.tabs.home, icon: 'home' },
  { key: 'routines', label: navigation.tabs.routines, icon: 'list' },
  { key: 'progress', label: navigation.tabs.progress, icon: 'chart' },
  { key: 'profile', label: navigation.tabs.profile, icon: 'user' },
];

function AppTabBar({ state, navigation: tabs }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <TabBar
      tabs={TABS}
      activeKey={state.routes[state.index].name}
      bottomInset={insets.bottom}
      onSelect={(key) => tabs.navigate(key)}
    />
  );
}

/** The 4 tabs of 08 §2; the workout (S09) is a full screen outside them. */
export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <AppTabBar {...props} />} screenOptions={{ headerShown: false }} />
  );
}
