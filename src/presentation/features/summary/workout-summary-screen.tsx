import * as Haptics from 'expo-haptics';
import { useEffect, useEffectEvent } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { LoadUnit } from '@/domain/models/vocabulary';
import { toUnit } from '@/domain/rules/units';
import type {
  SummaryLine,
  SummarySet,
  WorkoutSummary,
} from '@/domain/usecases/observe-workout-summary';
import { Button } from '@/presentation/components/button/button';
import { EmptyState } from '@/presentation/components/feedback/empty-state';
import { useReduceMotion } from '@/presentation/components/feedback/use-reduce-motion';
import { Icon } from '@/presentation/components/icons/icon';
import { Text } from '@/presentation/components/text';
import { Dialog } from '@/presentation/components/overlay/dialog';
import { useAccountNudgeViewModel } from '@/presentation/features/summary/use-account-nudge-view-model';
import { loadText, RecordCard } from '@/presentation/features/summary/record-card';
import {
  CountUp,
  DoneMark,
  ENTRANCE,
  EntranceStep,
  useEntrance,
} from '@/presentation/features/summary/summary-motion';
import { useWorkoutSummaryViewModel } from '@/presentation/features/summary/use-workout-summary-view-model';
import { reasonIcon } from '@/presentation/features/workout/reason-text';
import { dialogs } from '@/presentation/strings/dialogs';
import { catalog } from '@/presentation/strings/catalog';
import { common } from '@/presentation/strings/common';
import { home } from '@/presentation/strings/home';
import { wholeNumber } from '@/presentation/strings/numbers';
import { workout as text } from '@/presentation/strings/workout';
import { colors, radius, space, typography } from '@/presentation/theme';

const { summary: strings } = text;

interface WorkoutSummaryScreenProps {
  workoutId: string;
  /** «Listo», or the workout is gone: back to the tabs. */
  onDone: () => void;
  /** D13 «Crear cuenta». */
  onCreateAccount: () => void;
}

/**
 * S12 · Resumen del entrenamiento (RF-ENT-11.AC1, AC6; Figma «S12 · Resumen con récords» and «sin
 * récords», #223): the done mark, the total load as the main figure, the records first, each
 * exercise with its sets and the next workout. It enters once, without motion with «reduce motion».
 */
export function WorkoutSummaryScreen({
  workoutId,
  onDone,
  onCreateAccount,
}: WorkoutSummaryScreenProps) {
  const state = useWorkoutSummaryViewModel(workoutId);
  const nudge = useAccountNudgeViewModel(state.status === 'content', onCreateAccount);
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
      {state.status === 'content' && <Summary summary={state.summary} />}
      {state.status !== 'loading' && (
        <View style={[styles.bottom, { paddingBottom: insets.bottom + space.s8 }]}>
          <Button variant="primary" size="xl" label={strings.ready} onPress={onDone} />
        </View>
      )}
      {/* D13 (RF-AUTH-01.AC5): a guest is invited to back up, at most once every 7 days. */}
      <Dialog
        visible={nudge.visible}
        title={dialogs.D13.title}
        body={dialogs.D13.body}
        actions={[
          {
            label: dialogs.D13.createAccount,
            kind: 'advance',
            onPress: nudge.actions.createAccount,
          },
          { label: dialogs.D13.notNow, kind: 'plain', onPress: nudge.actions.notNow },
        ]}
        onDismiss={nudge.actions.notNow}
      />
    </View>
  );
}

/** «min», next to the duration when it is the main figure. */
const MINUTES = 'min';

function Summary({ summary }: { summary: WorkoutSummary }) {
  const animate = !useReduceMotion();
  const progress = useEntrance(animate);
  const { records, unit } = summary;
  const hasRecords = records.length > 0;

  // A success haptic when the main figure lands, and one more when the records come in.
  const haptics = useEffectEvent(() => {
    const success = () => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const timers = [setTimeout(success, animate ? ENTRANCE.numbers + ENTRANCE.countUp : 0)];
    if (hasRecords) timers.push(setTimeout(success, animate ? ENTRANCE.records : 150));
    return () => timers.forEach(clearTimeout);
  });
  useEffect(() => haptics(), []);

  const byLoad = summary.totalLoadKg !== null;
  const mainLabel = byLoad ? strings.totalLoad : strings.duration;
  const mainValue =
    summary.totalLoadKg === null ? summary.minutes : toUnit(summary.totalLoadKg, unit);
  const mainUnit = byLoad ? common.units[unit] : MINUTES;
  const mainFormat = byLoad ? wholeNumber : (n: number) => String(Math.round(n));

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <EntranceStep progress={progress} at={ENTRANCE.header}>
        <View style={styles.header}>
          <DoneMark animate={animate} />
          <View style={styles.headerTexts}>
            <Text style={[typography.label, { color: colors.textAccent }]}>
              {strings.title(summary.dayName)}
            </Text>
            <Text
              style={[typography.displayMl, { color: colors.textPrimary }]}
              accessibilityRole="header"
            >
              {strings.finished}
            </Text>
          </View>
        </View>
      </EntranceStep>
      <EntranceStep progress={progress} at={ENTRANCE.numbers}>
        <View style={styles.numbers}>
          <View
            accessible
            accessibilityLabel={strings.mainFigure(
              mainLabel,
              `${mainFormat(mainValue)} ${mainUnit}`,
            )}
            style={styles.main}
          >
            <Text style={[typography.label, { color: colors.textSecondary }]}>{mainLabel}</Text>
            <View style={styles.mainValue}>
              <CountUp
                value={mainValue}
                format={mainFormat}
                animate={animate}
                delayMs={ENTRANCE.numbers}
                style={[typography.numberHero, { color: colors.textPrimary }]}
              />
              <Text style={[typography.titleM, { color: colors.textSecondary }]}>{mainUnit}</Text>
            </View>
          </View>
          <View style={styles.stats}>
            {byLoad && <Stat value={strings.minutes(summary.minutes)} label={strings.duration} />}
            <Stat value={String(summary.sets)} label={strings.sets} />
            <Stat
              value={strings.doneOfTotal(summary.exercisesDone, summary.exercisesTotal)}
              label={strings.exercises}
            />
          </View>
        </View>
      </EntranceStep>
      <EntranceStep progress={progress} at={ENTRANCE.records}>
        {hasRecords ? (
          <View style={styles.section}>
            <Text style={[typography.titleM, { color: colors.textAccent }]}>
              {strings.todayRecords}
            </Text>
            {records.map((record, index) => (
              <RecordCard
                key={index}
                record={record}
                unit={unit}
                shineAt={animate ? ENTRANCE.records + ENTRANCE.step : null}
              />
            ))}
          </View>
        ) : (
          <View style={styles.encourage}>
            <Icon name="check" size={18} color={colors.textOk} />
            <Text style={[typography.bodyM, styles.flex, { color: colors.textSecondary }]}>
              {strings.noRecords(summary.sets)}
            </Text>
          </View>
        )}
      </EntranceStep>
      <EntranceStep progress={progress} at={ENTRANCE.list}>
        <View style={styles.section}>
          <Text style={[typography.titleM, { color: colors.textPrimary }]}>
            {strings.whatYouDid}
          </Text>
          <View style={styles.list}>
            {summary.lines.map((line, index) => (
              <SummaryRow key={index} line={line} unit={unit} first={index === 0} />
            ))}
          </View>
        </View>
      </EntranceStep>
      {summary.nextDayName !== null && (
        <EntranceStep progress={progress} at={ENTRANCE.next}>
          <View style={styles.next}>
            <View style={styles.flex}>
              <Text style={[typography.label, { color: colors.textSecondary }]}>
                {strings.nextWorkout}
              </Text>
              <Text style={[typography.displayS, { color: colors.textPrimary }]}>
                {summary.nextDayName}
              </Text>
            </View>
            <Icon name="arrow" size={22} color={colors.textAccent} />
          </View>
        </EntranceStep>
      )}
    </ScrollView>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[typography.numberMs, { color: colors.textPrimary }]}>{value}</Text>
      <Text style={[typography.tab, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

/**
 * Figma «SummaryRow»: an exercise with a chip per set (its best one lit) and what changes next
 * time; or skipped. TalkBack reads it as one line, not chip by chip.
 */
function SummaryRow({ line, unit, first }: { line: SummaryLine; unit: LoadUnit; first: boolean }) {
  const name = line.name ?? catalog.detail.unavailable;
  if (line.status === 'skipped') {
    return (
      <View
        accessible
        accessibilityLabel={strings.exerciseName(name, strings.skipped)}
        style={[styles.row, !first && styles.rowDivider]}
      >
        <View style={styles.flex}>
          <Text style={[typography.bodyRow, { color: colors.textSecondary }]}>{name}</Text>
          <Text style={[typography.bodyS, { color: colors.textSecondary }]}>{strings.skipped}</Text>
        </View>
        <View style={styles.trend}>
          <Icon name="skip" size={15} color={colors.textSecondary} />
        </View>
      </View>
    );
  }
  const { best, sets } = line;
  const setText = ({ loadKg, reps }: SummarySet) =>
    loadKg === null
      ? text.set.timesReps(reps)
      : `${loadText(loadKg, unit)} ${text.set.timesReps(reps)}`;
  const detail =
    best.loadKg === null
      ? strings.exerciseLineBodyweight(sets.length, best.reps)
      : strings.exerciseLine(sets.length, loadText(best.loadKg, unit), best.reps);
  const bestIndex = sets.findIndex((set) => set.loadKg === best.loadKg && set.reps === best.reps);
  return (
    <View
      accessible
      accessibilityLabel={strings.exerciseName(name, detail)}
      style={[styles.row, !first && styles.rowDivider]}
    >
      <View style={styles.flex}>
        <Text style={[typography.bodyRow, { color: colors.textPrimary }]}>{name}</Text>
        <View style={styles.chips}>
          {sets.map((set, index) => (
            <View key={index} style={[styles.chip, index === bestIndex && styles.chipBest]}>
              <Text
                style={[
                  typography.bodyS,
                  { color: index === bestIndex ? colors.textAccent : colors.textPrimary },
                ]}
              >
                {setText(set)}
              </Text>
            </View>
          ))}
        </View>
      </View>
      {/* What changes next time (S07 uses the same icons). */}
      <View style={styles.trend}>
        <Icon name={reasonIcon(line.next)} size={15} color={colors.textPrimary} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgBase },
  message: { padding: space.s16 },
  content: {
    gap: space.s20,
    paddingTop: space.s20,
    paddingHorizontal: space.s16,
    paddingBottom: 16,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.s16, paddingLeft: space.s4 },
  headerTexts: { flex: 1, gap: space.s4 },
  numbers: {
    gap: space.s16,
    paddingVertical: space.s20,
    paddingHorizontal: 18,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderAccentSoft,
    backgroundColor: colors.bgCard,
  },
  main: { gap: space.s4 },
  mainValue: { flexDirection: 'row', alignItems: 'baseline', gap: space.s8 },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: space.s16,
    borderTopWidth: 1,
    borderTopColor: colors.borderHair,
  },
  stat: { gap: 2 },
  encourage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s10,
    padding: space.s16,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderHair,
  },
  section: { gap: space.s10 },
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
    paddingVertical: space.s12,
    paddingHorizontal: space.s16,
  },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.borderHair },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingTop: 6 },
  chip: {
    paddingVertical: 4,
    paddingHorizontal: space.s8,
    borderRadius: 999,
    backgroundColor: colors.bgRaised,
  },
  chipBest: { borderWidth: 1, borderColor: colors.borderAccentSoft },
  trend: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: colors.bgRaised,
  },
  next: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s12,
    padding: space.s16,
    borderRadius: radius.xl,
    backgroundColor: colors.bgRaised,
  },
  bottom: {
    paddingTop: space.s10,
    paddingHorizontal: space.s16,
    borderTopWidth: 1,
    borderTopColor: colors.borderHair,
  },
});
