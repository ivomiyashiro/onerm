import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Icon } from '@/presentation/components/icons/icon';
import {
  SCREEN_IDS,
  screenRoutes,
  type ScreenRoute,
} from '@/presentation/features/dev/screen-routes';
import { dev } from '@/presentation/strings/dev';
import { colors, size, typography } from '@/presentation/theme';
import { Text } from '@/presentation/components/text';

interface DevMenuScreenProps {
  onOpen: (route: ScreenRoute) => void;
  onOpenComponents: () => void;
  onOpenBenchmark: () => void;
}

function Row({ label, id, onPress }: { label: string; id?: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={id ? `${id} ${label}` : label}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.bgCard }]}
    >
      {id && <Text style={[typography.monoS, styles.id]}>{id}</Text>}
      <Text style={[typography.bodyRow, styles.label]}>{label}</Text>
      <Icon name="chevron" size={20} color={colors.textSecondary} />
    </Pressable>
  );
}

/** Development only (#20): reaches every screen of 08 §2, the component showcase and the engine benchmark. */
export function DevMenuScreen({ onOpen, onOpenComponents, onOpenBenchmark }: DevMenuScreenProps) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={[typography.displayM, { color: colors.textPrimary }]} accessibilityRole="header">
        {dev.menuTitle}
      </Text>
      <View>
        <Row label={dev.components} onPress={onOpenComponents} />
        <Row label={dev.benchmark.entry} onPress={onOpenBenchmark} />
        {SCREEN_IDS.map((id) => (
          <Row key={id} id={id} label={dev.screens[id]} onPress={() => onOpen(screenRoutes[id])} />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgBase },
  content: { gap: 16, padding: 16, paddingTop: 56, paddingBottom: 48 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: size.targetMin,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderHair,
  },
  id: { width: 36, color: colors.textSecondary },
  label: { flex: 1, color: colors.textPrimary },
});
