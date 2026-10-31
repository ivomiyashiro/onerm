import { StyleSheet, View } from 'react-native';

import type { ExerciseTechnique as Technique } from '@/domain/models/exercise';
import { Text } from '@/presentation/components/text';
import { catalog } from '@/presentation/strings/catalog';
import { colors, radius, space, typography } from '@/presentation/theme';

/**
 * «Cómo se hace» (RF-CAT-02, #306): the numbered steps and the common mistakes. Shared by S17 and
 * the sheet of S09.
 */
export function ExerciseTechnique({ technique }: { technique: Technique }) {
  return (
    <>
      <View style={styles.steps}>
        <Text style={[typography.titleM, { color: colors.textPrimary }]} accessibilityRole="header">
          {catalog.detail.howTo}
        </Text>
        {technique.steps.map((step, index) => (
          <View key={step} style={styles.step}>
            <View style={styles.number}>
              <Text style={[typography.bodyMBold, { color: colors.textPrimary }]}>{index + 1}</Text>
            </View>
            <Text style={[typography.bodyL, styles.stepText]}>{step}</Text>
          </View>
        ))}
      </View>
      {technique.mistakes.length > 0 && (
        <View style={styles.mistakes}>
          <Text
            style={[typography.bodyRowBold, { color: colors.textWarn }]}
            accessibilityRole="header"
          >
            {catalog.detail.mistakes}
          </Text>
          {/* #319: a long mistake wraps under its own text, not under the bullet. */}
          {technique.mistakes.map((mistake) => (
            <View key={mistake} style={styles.mistake}>
              <Text
                style={[typography.bodyM, { color: colors.textSecondary }]}
                accessibilityElementsHidden
                importantForAccessibility="no"
              >
                {catalog.detail.bullet}
              </Text>
              <Text style={[typography.bodyM, styles.mistakeText]}>{mistake}</Text>
            </View>
          ))}
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  steps: { gap: space.s12 },
  step: { flexDirection: 'row', gap: space.s12 },
  number: {
    width: 26,
    height: 26,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgRaised,
  },
  stepText: { flex: 1, color: colors.textSecondary },
  mistakes: {
    gap: space.s8,
    padding: space.s16,
    borderRadius: radius.lg,
    backgroundColor: colors.bgWarnSoft,
  },
  mistake: { flexDirection: 'row', gap: space.s6 },
  mistakeText: { flex: 1, color: colors.textSecondary },
});
