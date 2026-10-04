import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon, type IconName } from '@/presentation/components/icons/icon';
import { colors, radius, size, typography } from '@/presentation/theme';

export interface TabItem {
  key: string;
  label: string;
  icon: IconName;
}

interface TabBarProps {
  tabs: TabItem[];
  activeKey: string;
  onSelect: (key: string) => void;
  /** Bottom safe area, so the tabs stay above the system navigation. */
  bottomInset?: number;
}

/**
 * Figma «TabBar»: the active tab gets a grey pill and light text, never lime (marca §7).
 * The Figma background blur is left out: it needs a native view; the 90 % background stays.
 */
export function TabBar({ tabs, activeKey, onSelect, bottomInset = 0 }: TabBarProps) {
  return (
    <View
      accessibilityRole="tablist"
      style={[styles.bar, { paddingBottom: Math.max(bottomInset, 8) }]}
    >
      {tabs.map((tab) => {
        const active = tab.key === activeKey;
        const color = active ? colors.textPrimary : colors.textSecondary;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: active }}
            onPress={() => onSelect(tab.key)}
            style={styles.tab}
          >
            <View style={[styles.pill, active && styles.pillActive]}>
              <Icon name={tab.icon} size={21} color={color} />
            </View>
            <Text style={[typography.tab, { color }]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 6,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderHair,
    backgroundColor: colors.bgTabbar,
  },
  tab: {
    flex: 1,
    minHeight: size.targetMain,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  pill: {
    width: 58,
    height: 32,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillActive: { backgroundColor: colors.bgRaised },
});
