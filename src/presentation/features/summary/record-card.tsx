import { StyleSheet, View } from 'react-native';

import type { LoadUnit } from '@/domain/models/vocabulary';
import { toUnit } from '@/domain/rules/units';
import type { SummaryRecord } from '@/domain/usecases/observe-workout-summary';
import { Icon } from '@/presentation/components/icons/icon';
import { Text } from '@/presentation/components/text';
import { catalog } from '@/presentation/strings/catalog';
import { common } from '@/presentation/strings/common';
import { loadNumber } from '@/presentation/strings/numbers';
import { workout as text } from '@/presentation/strings/workout';
import { colors, space, typography } from '@/presentation/theme';

const { summary: strings } = text;

/** «62,5 kg» in the unit of the profile (RN-PERF-05). */
export const loadText = (kg: number, unit: LoadUnit) =>
  `${loadNumber(toUnit(kg, unit), unit)} ${common.units[unit]}`;

/** Figma «RecordCard»: a record beaten in a workout (RF-PROG-05.AC2), in S12 and S19. */
export function RecordCard({ record, unit }: { record: SummaryRecord; unit: LoadUnit }) {
  const [kind, value] =
    record.kind === 'heaviestLoad'
      ? [
          strings.heaviestLoad,
          `${loadText(record.loadKg, unit)} ${text.set.timesReps(record.reps)}`,
        ]
      : [
          strings.estimatedMax,
          record.e1rm.precision === 'approximate'
            ? strings.approximate(loadText(record.e1rm.value, unit))
            : loadText(record.e1rm.value, unit),
        ];
  return (
    <View style={styles.record}>
      <View style={styles.trophy}>
        <Icon name="trophy" color={colors.textOnAccent} />
      </View>
      <View style={styles.texts}>
        <Text style={[typography.label, { color: colors.textAccent }]}>
          {strings.recordTitle(kind)}
        </Text>
        <Text style={[typography.numberMl, { color: colors.textPrimary }]}>{value}</Text>
        <Text style={[typography.bodyS, { color: colors.textSecondary }]}>
          {record.name ?? catalog.detail.unavailable}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  record: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: space.s16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderAccentSoft,
    backgroundColor: colors.bgCard,
  },
  trophy: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: colors.bgAccent,
  },
  texts: { flex: 1, gap: 2 },
});
