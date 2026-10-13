import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/presentation/components/text';
import { colors, typography } from '@/presentation/theme';

interface OptionCardProps {
  title: string;
  body: string;
  selected: boolean;
  onPress: () => void;
}

/**
 * Figma «OptionCard»: one choice of a single-choice list (onboarding, settings). Chosen: state
 * background, soft lime border and lime radio.
 */
export function OptionCard({ title, body, selected, onPress }: OptionCardProps) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={title}
      accessibilityHint={body}
      onPress={onPress}
      style={[styles.card, selected && styles.selected]}
    >
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected && <View style={styles.dot} />}
      </View>
      <View style={styles.text}>
        <Text style={[typography.bodyLStrong, { color: colors.textPrimary }]}>{title}</Text>
        <Text style={[typography.bodyM, { color: colors.textSecondary }]}>{body}</Text>
      </View>
    </Pressable>
  );
}

const RADIO = 22;
const DOT = 10;

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderHair,
    backgroundColor: colors.bgCard,
  },
  selected: { borderColor: colors.borderAccentSoft, backgroundColor: colors.bgCurrent },
  radio: {
    width: RADIO,
    height: RADIO,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIO / 2,
    borderWidth: 1.5,
    borderColor: colors.borderControl,
  },
  radioSelected: { borderColor: colors.borderAccent },
  dot: { width: DOT, height: DOT, borderRadius: DOT / 2, backgroundColor: colors.bgAccent },
  text: { flex: 1, gap: 4 },
});
