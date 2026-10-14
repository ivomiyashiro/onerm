import { useEffect, useEffectEvent } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Id } from '@/domain/models/vocabulary';
import { PROGRESS_PERIODS } from '@/domain/rules/progress/period';
import { Segmented } from '@/presentation/components/choice/segmented';
import { EmptyState } from '@/presentation/components/feedback/empty-state';
import { SkeletonRow } from '@/presentation/components/feedback/skeleton';
import { TopBar } from '@/presentation/components/navigation/top-bar';
import { Text } from '@/presentation/components/text';
import { ProgressChart } from '@/presentation/features/progress/progress-chart';
import {
  useExerciseProgressViewModel,
  type ExerciseProgressContent,
  type StatCard,
} from '@/presentation/features/progress/use-exercise-progress-view-model';
import { catalog } from '@/presentation/strings/catalog';
import { common } from '@/presentation/strings/common';
import { home } from '@/presentation/strings/home';
import { progress } from '@/presentation/strings/progress';
import { colors, radius, space, typography } from '@/presentation/theme';

const text = progress.exercise;

interface ExerciseProgressScreenProps {
  exerciseId: Id;
  /** Back, or nothing to show: to where it was opened from. */
  onClose: () => void;
}

/**
 * S20 · Progreso de ejercicio (RF-PROG-04, RF-PROG-05; Figma «S20 · Progreso de ejercicio», «Un
 * solo punto», «Solo mejor serie», «Peso corporal» and «Cargando»).
 */
export function ExerciseProgressScreen({ exerciseId, onClose }: ExerciseProgressScreenProps) {
  const { state, period, actions } = useExerciseProgressViewModel(exerciseId);
  const insets = useSafeAreaInsets();

  // The route's callback is a new function on every render: only the status matters.
  const leave = useEffectEvent(() => onClose());
  const missing = state.status === 'missing';
  useEffect(() => {
    if (missing) leave();
  }, [missing]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <TopBar title={text.title} backLabel={common.back} onBack={onClose} />
      <ScrollView contentContainerStyle={styles.content}>
        {state.status === 'loading' && <SkeletonRow testID="progress-skeleton" />}
        {state.status === 'error' && (
          <EmptyState icon="alert" title={home.readError.title} body={home.readError.body} />
        )}
        {state.status === 'content' && (
          <>
            <Text
              style={[typography.titleXl, { color: colors.textPrimary }]}
              accessibilityRole="header"
            >
              {state.name ?? catalog.detail.unavailable}
            </Text>
            <View style={styles.cards}>
              {state.cards.map((card) => (
                <Card key={card.label} card={card} />
              ))}
            </View>
            <Segmented
              options={PROGRESS_PERIODS.map((value) => ({ value, label: text.periods[value] }))}
              selected={period}
              onSelect={actions.choosePeriod}
              label={text.period}
            />
            <Chart content={state} />
            {state.bestSets.length > 0 && (
              <View style={styles.section}>
                <Text style={[typography.titleM, { color: colors.textPrimary }]}>
                  {text.bestSetPerWorkout}
                </Text>
                <View style={styles.list}>
                  {state.bestSets.map((row, index) => (
                    <View key={row.key} style={[styles.row, index > 0 && styles.rowDivider]}>
                      <Text style={[typography.bodyRow, { color: colors.textPrimary }]}>
                        {row.date}
                      </Text>
                      <Text style={[typography.bodyS, { color: colors.textSecondary }]}>
                        {row.set}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Card({ card }: { card: StatCard }) {
  return (
    <View style={styles.card}>
      <Text style={[typography.label, { color: colors.textSecondary }]}>{card.label}</Text>
      <Text style={[typography.numberMl, { color: colors.textPrimary }]}>{card.value}</Text>
      <Text style={[typography.bodyS, { color: colors.textAccent }]}>{card.caption}</Text>
    </View>
  );
}

/** The chart, its legend and help; with one point, the «¡Buen comienzo!» card (AC4). */
function Chart({ content }: { content: ExerciseProgressContent }) {
  const { chart } = content;
  if (chart.points.length === 0) return null;
  return (
    <>
      <View style={styles.chart}>
        <Text style={[typography.bodyMStrong, { color: colors.textPrimary }]}>{chart.title}</Text>
        <ProgressChart points={chart.points} label={chart.title} />
        {chart.legend && chart.points.length > 1 && (
          <View style={styles.legend}>
            <Legend fill={colors.textPrimary} label={text.highPrecision} />
            <Legend fill={colors.bgCard} label={text.approximatePrecision} />
            <Legend fill={colors.bgAccent} stroke={colors.bgAccent} label={text.recordLegend} />
          </View>
        )}
        {chart.points.length > 1 && (
          <Text style={[typography.bodyS, { color: colors.textSecondary }]}>{chart.help}</Text>
        )}
      </View>
      {chart.points.length === 1 && (
        <EmptyState icon="chart" title={text.onePoint.title} body={text.onePoint.body} />
      )}
    </>
  );
}

function Legend({
  fill,
  stroke = colors.textPrimary,
  label,
}: {
  fill: string;
  stroke?: string;
  label: string;
}) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.dot, { backgroundColor: fill, borderColor: stroke }]} />
      <Text style={[typography.bodyS, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgBase },
  content: { gap: space.s16, paddingHorizontal: space.s16, paddingBottom: space.s24 },
  cards: { flexDirection: 'row', gap: space.s10 },
  card: {
    flex: 1,
    gap: 2,
    padding: space.s12,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderHair,
    backgroundColor: colors.bgCard,
  },
  chart: {
    gap: space.s12,
    padding: space.s16,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderHair,
    backgroundColor: colors.bgCard,
  },
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: space.s16, rowGap: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5, borderWidth: 2 },
  section: { gap: space.s10 },
  list: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderHair,
    backgroundColor: colors.bgCard,
  },
  row: { gap: 2, paddingVertical: space.s12, paddingHorizontal: space.s16 },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.borderHair },
});
