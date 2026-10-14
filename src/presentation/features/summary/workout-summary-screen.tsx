import { useEffect, useEffectEvent } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { LoadUnit } from '@/domain/models/vocabulary';
import type { SummaryLine } from '@/domain/usecases/observe-workout-summary';
import { Button } from '@/presentation/components/button/button';
import { EmptyState } from '@/presentation/components/feedback/empty-state';
import { Icon, type IconName } from '@/presentation/components/icons/icon';
import { Text } from '@/presentation/components/text';
import { loadText, RecordCard } from '@/presentation/features/summary/record-card';
import { useWorkoutSummaryViewModel } from '@/presentation/features/summary/use-workout-summary-view-model';
import { reasonIcon } from '@/presentation/features/workout/reason-text';
import { catalog } from '@/presentation/strings/catalog';
import { home } from '@/presentation/strings/home';
import { workout as text } from '@/presentation/strings/workout';
import { colors, radius, space, typography } from '@/presentation/theme';

const { summary: strings } = text;

interface WorkoutSummaryScreenProps {
  workoutId: string;
  /** «Listo», or the workout is gone: back to the tabs. */
  onDone: () => void;
}

/** S12 · Resumen del entrenamiento (RF-ENT-11.AC1, Figma «S12 · Resumen con récords»). */
export function WorkoutSummaryScreen({ workoutId, onDone }: WorkoutSummaryScreenProps) {
  const state = useWorkoutSummaryViewModel(workoutId);
  const insets = useSafeAreaInsets();

  // The route's callback is a new function on every render: only the status matters.
  const leave = useEffectEvent(() => onDone());
  const missing = state.status === 'missing';
  useEffect(() => {
    if (missing) leave();
  }, [missing]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {state.status === 'error' && (
        <View style={styles.message}>
          <EmptyState icon="alert" title={home.readError.title} body={home.readError.body} />
        </View>
      )}
      {state.status === 'content' && (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <Text style={[typography.label, { color: colors.textSecondary }]}>
              {strings.title(state.summary.dayName)}
            </Text>
            <Text
              style={[typography.displayMl, { color: colors.textPrimary }]}
              accessibilityRole="header"
            >
              {strings.finished}
            </Text>
          </View>
          <View style={styles.numbers}>
            <Stat value={strings.minutes(state.summary.minutes)} label={strings.duration} />
            <Stat value={String(state.summary.sets)} label={strings.sets} />
            <Stat
              value={strings.doneOfTotal(state.summary.exercisesDone, state.summary.exercisesTotal)}
              label={strings.exercises}
            />
          </View>
          {state.summary.records.length > 0 && (
            <View style={styles.section}>
              <Text style={[typography.titleM, { color: colors.textPrimary }]}>
                {strings.todayRecords}
              </Text>
              {state.summary.records.map((record, index) => (
                <RecordCard key={index} record={record} unit={state.summary.unit} />
              ))}
            </View>
          )}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[typography.titleM, { color: colors.textPrimary }]}>
                {strings.whatYouDid}
              </Text>
              {state.summary.nextDayName !== null && (
                <Text style={[typography.bodyS, { color: colors.textSecondary }]}>
                  {strings.nextDay(state.summary.nextDayName)}
                </Text>
              )}
            </View>
            <View style={styles.list}>
              {state.summary.lines.map((line, index) => (
                <SummaryRow key={index} line={line} unit={state.summary.unit} first={index === 0} />
              ))}
            </View>
          </View>
        </ScrollView>
      )}
      {state.status !== 'loading' && (
        <View style={[styles.bottom, { paddingBottom: insets.bottom + space.s8 }]}>
          <Button variant="primary" size="xl" label={strings.ready} onPress={onDone} />
        </View>
      )}
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[typography.numberL, { color: colors.textPrimary }]}>{value}</Text>
      <Text style={[typography.tab, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

/** Figma «SummaryRow»: an exercise with its sets and best set, or skipped. */
function SummaryRow({ line, unit, first }: { line: SummaryLine; unit: LoadUnit; first: boolean }) {
  let detail: string;
  let icon: IconName;
  if (line.status === 'skipped') {
    detail = strings.skipped;
    icon = 'skip';
  } else {
    const { loadKg, reps } = line.best;
    detail =
      loadKg === null
        ? strings.exerciseLineBodyweight(line.sets, reps)
        : strings.exerciseLine(line.sets, loadText(loadKg, unit), reps);
    // What changes next time (S07 uses the same icons).
    icon = reasonIcon(line.next);
  }
  return (
    <View style={[styles.row, !first && styles.rowDivider]}>
      <View style={styles.flex}>
        <Text style={[typography.bodyRow, { color: colors.textPrimary }]}>
          {line.name ?? catalog.detail.unavailable}
        </Text>
        <Text style={[typography.bodyS, { color: colors.textSecondary }]}>{detail}</Text>
      </View>
      <View style={styles.trend}>
        <Icon name={icon} size={15} color={colors.textPrimary} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgBase },
  message: { padding: space.s16 },
  content: {
    gap: space.s20,
    paddingTop: space.s12,
    paddingHorizontal: space.s16,
    paddingBottom: 16,
  },
  header: { gap: space.s8, paddingLeft: space.s4 },
  numbers: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: space.s16,
    paddingHorizontal: 18,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderHair,
    backgroundColor: colors.bgCard,
  },
  stat: { gap: 2 },
  section: { gap: space.s10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  flex: { flex: 1, gap: 2 },
  list: {
    overflow: 'hidden',
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderHair,
    backgroundColor: colors.bgCard,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    paddingVertical: space.s10,
    paddingHorizontal: space.s16,
  },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.borderHair },
  trend: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: colors.bgRaised,
  },
  bottom: {
    paddingTop: space.s10,
    paddingHorizontal: space.s16,
    borderTopWidth: 1,
    borderTopColor: colors.borderHair,
  },
});
