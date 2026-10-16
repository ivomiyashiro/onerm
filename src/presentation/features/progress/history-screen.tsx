import { memo, useMemo, useState } from 'react';
import { Pressable, ScrollView, SectionList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Id } from '@/domain/models/vocabulary';
import type { HistoryItem } from '@/domain/usecases/observe-history';
import { EmptyState } from '@/presentation/components/feedback/empty-state';
import { SkeletonRow } from '@/presentation/components/feedback/skeleton';
import { Badge } from '@/presentation/components/badge/badge';
import { Icon } from '@/presentation/components/icons/icon';
import { SectionTabs } from '@/presentation/components/navigation/section-tabs';
import { Text } from '@/presentation/components/text';
import { useHistoryViewModel } from '@/presentation/features/progress/use-history-view-model';
import { WeeklyVolumeView } from '@/presentation/features/progress/weekly-volume-view';
import { common } from '@/presentation/strings/common';
import { progress as text } from '@/presentation/strings/progress';
import { colors, radius, space, typography } from '@/presentation/theme';

const SKELETON_ROWS = 4;

interface HistoryScreenProps {
  onOpenWorkout: (workoutId: Id) => void;
  /** «Empezar el próximo» (RF-PROG-01.AC3). */
  onStartNext: () => void;
}

/**
 * S18 · Progreso (Figma «S18 · Historial» and «Volumen semanal»): Historial (RF-PROG-01): the finished workouts by month,
 * in a virtualized list so a long history scrolls without stutter (AC4, RNF-14).
 */
export function HistoryScreen({ onOpenWorkout, onStartNext }: HistoryScreenProps) {
  const { state, actions } = useHistoryViewModel();
  const insets = useSafeAreaInsets();
  const [section, setSection] = useState<'history' | 'volume'>('history');
  // RNF-14: a new array on every render would re-render every visible row.
  const sections = useMemo(
    () =>
      state.status === 'content'
        ? state.months.map((month) => ({ ...month, data: month.items }))
        : [],
    [state],
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <Text style={[typography.displayM, styles.title]} accessibilityRole="header">
        {text.overview.title}
      </Text>
      <View style={styles.tabs}>
        <SectionTabs
          tabs={[
            { key: 'history', label: text.overview.history },
            { key: 'volume', label: text.overview.volume },
          ]}
          selectedKey={section}
          onSelect={setSection}
        />
      </View>
      {section === 'volume' ? (
        <ScrollView contentContainerStyle={styles.list}>
          <WeeklyVolumeView />
        </ScrollView>
      ) : state.status === 'content' ? (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={styles.sections}
          renderSectionHeader={({ section }) => (
            <Text style={[typography.label, styles.month]}>{section.title}</Text>
          )}
          renderItem={({ item, index, section }) => (
            <HistoryRow
              item={item}
              first={index === 0}
              last={index === section.data.length - 1}
              onOpen={onOpenWorkout}
            />
          )}
        />
      ) : (
        <View style={styles.list}>
          {state.status === 'loading' &&
            Array.from({ length: SKELETON_ROWS }, (_, i) => (
              <SkeletonRow key={i} testID="history-skeleton" />
            ))}
          {state.status === 'empty' && (
            <EmptyState
              icon="chart"
              title={text.overview.empty.title}
              body={text.overview.empty.body}
              action={{ label: text.overview.empty.action, onPress: onStartNext }}
            />
          )}
          {state.status === 'error' && (
            <EmptyState
              icon="alert"
              title={text.overview.readError.title}
              body={text.overview.readError.body}
              action={{ label: text.overview.readError.retry, onPress: actions.retry }}
            />
          )}
        </View>
      )}
    </View>
  );
}

/**
 * A workout of the history: its date, day and routine, duration, sets and records, and «Pendiente»
 * while an account's workout is not backed up yet (RF-PROG-01.AC2).
 */
const HistoryRow = memo(function HistoryRow({
  item,
  first,
  last,
  onOpen,
}: {
  item: HistoryItem;
  first: boolean;
  last: boolean;
  onOpen: (workoutId: Id) => void;
}) {
  const title = text.overview.workoutTitle(item.dayName, item.routineName);
  const month = common.months[item.finishedAt.getMonth()];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={item.pending ? `${title}, ${text.overview.pending}` : title}
      onPress={() => onOpen(item.id)}
      style={({ pressed }) => [
        styles.row,
        first && styles.rowFirst,
        last && styles.rowLast,
        !first && styles.rowDivider,
        pressed && { backgroundColor: colors.bgRaised },
      ]}
    >
      <View style={styles.date}>
        <Text style={[typography.numberSm, { color: colors.textPrimary }]}>
          {String(item.finishedAt.getDate())}
        </Text>
        <Text style={[typography.labelS, { color: colors.textSecondary }]}>
          {month.slice(0, 3)}
        </Text>
      </View>
      <View style={styles.texts}>
        <Text style={[typography.bodyRow, { color: colors.textPrimary }]}>{title}</Text>
        <View style={styles.meta}>
          <Text style={[typography.bodyS, { color: colors.textSecondary }]}>
            {text.overview.workoutMeta(item.minutes, item.sets)}
          </Text>
          {item.records > 0 && (
            <View style={styles.records}>
              <Icon name="trophy" size={14} color={colors.textAccent} />
              <Text style={[typography.bodyS, { color: colors.textAccent }]}>
                {text.overview.records(item.records)}
              </Text>
            </View>
          )}
          {item.pending && <Badge label={text.overview.pending} />}
        </View>
      </View>
      <Icon name="chevron" size={20} color={colors.textPrimary} />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgBase },
  title: {
    color: colors.textPrimary,
    textTransform: 'uppercase',
    paddingVertical: space.s4,
    paddingHorizontal: space.s20,
  },
  tabs: { paddingHorizontal: space.s16 },
  // The rows of a month touch: they make one card.
  sections: { paddingHorizontal: space.s16, paddingBottom: 120 },
  list: { gap: space.s10, paddingTop: space.s8, paddingHorizontal: space.s16, paddingBottom: 120 },
  month: { color: colors.textSecondary, paddingTop: space.s12, paddingBottom: space.s8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s12,
    minHeight: 72,
    paddingVertical: space.s12,
    paddingLeft: space.s12,
    paddingRight: space.s8,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.borderHair,
    backgroundColor: colors.bgCard,
  },
  rowFirst: {
    borderTopWidth: 1,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
  rowLast: {
    borderBottomWidth: 1,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
  },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.borderHair },
  date: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.bgRaised,
  },
  texts: { flex: 1, gap: 2 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: space.s8 },
  records: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
