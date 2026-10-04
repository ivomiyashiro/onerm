import { TabBar, type TabItem } from '@/presentation/components/navigation/tab-bar';

/** The part of React Navigation's tab bar props that the bar uses. */
interface TabNavigationProps {
  state: { index: number; routes: { key: string; name: string }[] };
  navigation: {
    emit(event: { type: 'tabPress'; target: string; canPreventDefault: true }): {
      defaultPrevented: boolean;
    };
    navigate(name: string): void;
  };
}

/**
 * Connects the TabBar to the router. Like React Navigation's own bar, it emits `tabPress` first,
 * so a screen can react to it (scroll to top, pop to root) or prevent the change.
 */
export function RouterTabBar({
  tabs,
  state,
  navigation,
  bottomInset,
}: TabNavigationProps & { tabs: TabItem[]; bottomInset: number }) {
  const active = state.routes[state.index];

  function select(name: string) {
    const route = state.routes.find((r) => r.name === name);
    if (!route) return;
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (!event.defaultPrevented && route.key !== active.key) {
      navigation.navigate(name);
    }
  }

  return <TabBar tabs={tabs} activeKey={active.name} onSelect={select} bottomInset={bottomInset} />;
}
