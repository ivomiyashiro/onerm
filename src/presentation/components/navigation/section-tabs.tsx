import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/presentation/components/text';
import { colors, size, typography } from '@/presentation/theme';

interface SectionTabsProps<K extends string> {
  tabs: { key: K; label: string }[];
  selectedKey: K;
  onSelect: (key: K) => void;
}

/**
 * Figma «Tabs»: the sections of a screen (Mis rutinas / Plantillas, Historial / Volumen), with a
 * lime indicator under the selected one and a 1 dp line. Each tab is 48 dp high (RNF-16).
 */
export function SectionTabs<K extends string>({
  tabs,
  selectedKey,
  onSelect,
}: SectionTabsProps<K>) {
  return (
    <View accessibilityRole="tablist" style={styles.tabs}>
      {tabs.map((tab) => {
        const selected = tab.key === selectedKey;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onSelect(tab.key)}
            style={styles.tab}
          >
            <Text
              style={[
                typography.buttonDefault,
                { color: selected ? colors.textPrimary : colors.textSecondary },
              ]}
            >
              {tab.label}
            </Text>
            {selected && <View style={styles.indicator} />}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderHair,
  },
  // The 48 dp go on the tab: the line below is outside them.
  tab: { flex: 1, height: size.targetMin, alignItems: 'center', justifyContent: 'center' },
  indicator: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -1,
    height: 3,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    backgroundColor: colors.bgAccent,
  },
});
