import { Pressable, StyleSheet, View } from 'react-native';

import { Badge } from '@/presentation/components/badge/badge';
import { Icon } from '@/presentation/components/icons/icon';
import { Text } from '@/presentation/components/text';
import { colors, radius, size, typography } from '@/presentation/theme';

interface RoutineCardProps {
  name: string;
  summary: string;
  /** «Rutina activa» or «Recomendada para vos». */
  label?: string;
  /** The active routine: state background and soft lime border (S13 «Rutina activa destacada»). */
  highlighted?: boolean;
  /** Opens the card (a template's detail). */
  onPress?: () => void;
  /** The «⋯» of an own routine, with its accessible name. */
  menu?: { label: string; onPress: () => void };
}

/** Figma «RoutineCard» (S13): a routine or a template. */
export function RoutineCard({
  name,
  summary,
  label,
  highlighted = false,
  onPress,
  menu,
}: RoutineCardProps) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      disabled={onPress === undefined}
      style={[styles.card, highlighted && styles.highlighted]}
    >
      <View style={styles.header}>
        <Text style={[typography.titleM, styles.name]}>{name}</Text>
        {menu && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={menu.label}
            onPress={menu.onPress}
            style={styles.menu}
          >
            <Icon name="dots" size={20} color={colors.textPrimary} />
          </Pressable>
        )}
      </View>
      <Text style={[typography.bodyM, { color: colors.textSecondary }]}>{summary}</Text>
      {label && (
        <View style={styles.label}>
          <Badge label={label} tone="inverse" />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 6,
    paddingTop: 12,
    paddingBottom: 16,
    paddingLeft: 16,
    paddingRight: 8,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderHair,
    backgroundColor: colors.bgCard,
  },
  highlighted: { borderColor: colors.borderAccentSoft, backgroundColor: colors.bgCurrent },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { flex: 1, color: colors.textPrimary },
  menu: {
    width: size.targetMin,
    height: size.targetMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { flexDirection: 'row' },
});
