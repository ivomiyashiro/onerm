import { StyleSheet, View } from 'react-native';

import type { LoadUnit } from '@/domain/models/vocabulary';
import { toUnit } from '@/domain/rules/shared/units';
import { Text } from '@/presentation/components/text';
import type { NextDayContent } from '@/presentation/features/home/next-day';
import { deltaOf, trendOf, type Delta } from '@/presentation/shared/trend';
import { catalog } from '@/presentation/strings/catalog';
import { common } from '@/presentation/strings/common';
import { home } from '@/presentation/strings/home';
import { loadNumber } from '@/presentation/strings/numbers';
import { colors, radius, size, space, typography } from '@/presentation/theme';

const DELTA_COLORS: Record<Delta['tone'], { color: string; bg: string }> = {
  up: { color: colors.textAccent, bg: colors.bgAccentSoft },
  down: { color: colors.textWarn, bg: colors.bgWarnSoft },
  reps: { color: colors.textOk, bg: colors.bgOkSoft },
  same: { color: colors.textSecondary, bg: colors.bgRaised },
};

/**
 * Figma «ExerciseRow» (#225): its number, the exercise with «Principal», its muscle and
 * prescription, and the suggestion (RF-SUG-01.AC1) with what changes; nothing to calibrate (#196).
 */
export function TodayRow({
  exercise,
  index,
  unit,
}: {
  exercise: NextDayContent['day']['exercises'][number];
  index: number;
  unit: LoadUnit;
}) {
  const { name, muscle, prescription, suggestion } = exercise;
  const main = prescription.role === 'main';
  const trend = trendOf(suggestion.reason.code);
  const delta = deltaOf(suggestion, unit);
  const detail = home.exerciseDetail(
    main,
    muscle === null ? null : catalog.muscles[muscle],
    prescription.sets,
    prescription.repRange.min,
    prescription.repRange.max,
  );
  const value =
    trend === 'calibrate'
      ? null
      : `${suggestion.loadKg === null ? '' : `${loadNumber(toUnit(suggestion.loadKg, unit), unit)} ${common.units[unit]} `}${home.timesReps(suggestion.reps)}`;
  const label = name ?? catalog.detail.unavailable;
  return (
    <View
      accessible
      accessibilityLabel={[label, detail, value, delta?.text].filter(Boolean).join(', ')}
      style={[styles.row, index > 0 && styles.rowDivider]}
    >
      <View style={[styles.index, main && styles.indexMain]}>
        <Text
          style={[typography.numberS, { color: main ? colors.textAccent : colors.textSecondary }]}
        >
          {String(index + 1).padStart(2, '0')}
        </Text>
      </View>
      <View style={styles.rowTexts}>
        <Text style={[typography.bodyRow, { color: colors.textPrimary }]}>{label}</Text>
        <Text style={[typography.bodyS, { color: colors.textSecondary }]}>{detail}</Text>
      </View>
      {value !== null && (
        <View style={styles.suggestion}>
          <View style={styles.value}>
            {suggestion.loadKg !== null && (
              <>
                <Text style={[typography.numberSm, { color: colors.textPrimary }]}>
                  {loadNumber(toUnit(suggestion.loadKg, unit), unit)}
                </Text>
                <Text style={[typography.bodyS, { color: colors.textSecondary }]}>
                  {common.units[unit]}
                </Text>
              </>
            )}
            <Text style={[typography.numberSm, { color: colors.textPrimary }]}>
              {home.timesReps(suggestion.reps)}
            </Text>
          </View>
          {delta !== null && (
            <View style={[styles.delta, { backgroundColor: DELTA_COLORS[delta.tone].bg }]}>
              <Text style={[typography.tab, { color: DELTA_COLORS[delta.tone].color }]}>
                {delta.text}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s12,
    minHeight: size.targetMain,
    paddingVertical: space.s14,
    paddingHorizontal: space.s16,
  },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.borderHair },
  index: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: colors.bgRaised,
  },
  indexMain: { backgroundColor: colors.bgAccentSoft },
  rowTexts: { flex: 1, gap: 2 },
  suggestion: { alignItems: 'flex-end', gap: space.s4 },
  value: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  delta: { paddingVertical: 2, paddingHorizontal: space.s6, borderRadius: radius.full },
});
