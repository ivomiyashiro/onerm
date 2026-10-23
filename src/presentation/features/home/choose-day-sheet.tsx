import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Badge } from '@/presentation/components/badge/badge';
import { Button } from '@/presentation/components/button/button';
import { SheetOverlay } from '@/presentation/components/overlay/bottom-sheet';
import { Text } from '@/presentation/components/text';
import { useChooseDayViewModel } from '@/presentation/features/home/use-choose-day-view-model';
import { catalog } from '@/presentation/strings/catalog';
import { common } from '@/presentation/strings/common';
import { home } from '@/presentation/strings/home';
import { colors, space, typography } from '@/presentation/theme';

interface ChooseDaySheetProps {
  onClose: () => void;
  /** The chosen day started: S09. */
  onStarted: () => void;
}

/** S08 · Elegir día (RF-ENT-01.AC3), a route sheet over S07 (Figma «S08 · Elegir día»). */
export function ChooseDaySheet({ onClose, onStarted }: ChooseDaySheetProps) {
  const { state, actions } = useChooseDayViewModel(onStarted);
  const unavailable = state.status === 'unavailable';
  // Nothing to choose from (the routine stopped being active): back to S07.
  useEffect(() => {
    if (unavailable) onClose();
  }, [unavailable, onClose]);
  if (state.status !== 'content') return null;

  const selected = state.days.find((day) => day.id === state.selectedId);
  return (
    <SheetOverlay
      title={home.chooseDay.title}
      subtitle={home.chooseDay.subtitle(state.routineName, state.days.length)}
      closeLabel={common.close}
      onClose={onClose}
      scrollContent
      footer={
        selected && (
          <Button
            variant="primary"
            size="xl"
            label={home.chooseDay.choose(selected.name)}
            onPress={() => void actions.start()}
          />
        )
      }
    >
      <View accessibilityRole="radiogroup" style={styles.days}>
        {state.days.map((day) => {
          const checked = day.id === state.selectedId;
          const done =
            day.daysAgo === null
              ? home.chooseDay.neverDone
              : // With 0 the text doesn't appear (13 §1, plurals).
                day.daysAgo > 0
                ? home.chooseDay.doneDaysAgo(day.daysAgo)
                : null;
          return (
            <Pressable
              key={day.id}
              accessibilityRole="radio"
              accessibilityLabel={day.name}
              accessibilityState={{ checked }}
              onPress={() => actions.select(day.id)}
              style={[styles.day, checked && styles.dayChecked]}
            >
              <View style={[styles.radio, checked && styles.radioChecked]}>
                {checked && <View style={styles.dot} />}
              </View>
              <View style={styles.texts}>
                <View style={styles.titleRow}>
                  <Text style={[typography.bodyLStrong, styles.name]}>{day.name}</Text>
                  {day.id === state.recommendedId && (
                    <Badge label={home.chooseDay.recommended} tone="inverse" />
                  )}
                </View>
                {done && (
                  <Text style={[typography.bodyM, { color: colors.textSecondary }]}>{done}</Text>
                )}
                <Text style={[typography.bodyS, { color: colors.textSecondary }]} numberOfLines={1}>
                  {day.exerciseNames.map((name) => name ?? catalog.detail.unavailable).join(', ')}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </SheetOverlay>
  );
}

const RADIO = 22;
const DOT = 10;

const styles = StyleSheet.create({
  days: { gap: space.s10 },
  day: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderHair,
    backgroundColor: colors.bgCard,
  },
  dayChecked: { borderColor: colors.borderAccentSoft, backgroundColor: colors.bgCurrent },
  radio: {
    width: RADIO,
    height: RADIO,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIO / 2,
    borderWidth: 1.5,
    borderColor: colors.borderControl,
  },
  radioChecked: { borderColor: colors.borderAccent },
  dot: { width: DOT, height: DOT, borderRadius: DOT / 2, backgroundColor: colors.bgAccent },
  texts: { flex: 1, gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.s8 },
  name: { flex: 1, color: colors.textPrimary },
});
