import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { EffortMode } from '@/domain/models/vocabulary';
import type { WorkoutSet } from '@/domain/models/workout';
import { Button } from '@/presentation/components/button/button';
import { Icon } from '@/presentation/components/icons/icon';
import { Text } from '@/presentation/components/text';
import { RestRing } from '@/presentation/features/workout/rest-ring';
import type { RestView } from '@/presentation/features/workout/rest-view';
import { SetEffort } from '@/presentation/features/workout/set-effort';
import type { RirField } from '@/presentation/features/workout/set-form';
import { common } from '@/presentation/strings/common';
import { countdown, elapsed } from '@/presentation/strings/numbers';
import { workout as text } from '@/presentation/strings/workout';
import { colors, radius, space, typography } from '@/presentation/theme';

interface RestScreenProps {
  rest: RestView;
  visible: boolean;
  remainingMs: number;
  effortMode: EffortMode;
  onAdd: () => void;
  onRestart: () => void;
  /** «Saltear descanso», or «Ir a la serie n» once it ended. */
  onSkip: () => void;
  onMinimize: () => void;
  onEffort: (set: WorkoutSet, field: RirField, rir: number) => void;
}

/**
 * S09 descanso a pantalla completa (08 §5, marca §13; Figma «Descanso (pantalla completa)» and
 * «Descanso terminado»): the countdown with its ring, +15 s and Reiniciar, the set just done with
 * its effort, what comes next and «Saltear descanso». Back minimizes it.
 */
export function RestScreen({
  rest,
  visible,
  remainingMs,
  effortMode,
  onAdd,
  onRestart,
  onSkip,
  onMinimize,
  onEffort,
}: RestScreenProps) {
  const insets = useSafeAreaInsets();
  const finished = remainingMs <= 0;
  const { next } = rest;
  const nextSet = next.kind === 'set' || next.kind === 'calibrating' ? next.number : null;
  const goLabel =
    nextSet !== null
      ? text.rest.goToSet(nextSet)
      : next.kind === 'exercise'
        ? text.primaryAction.nextExercise
        : common.close;

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={onMinimize}>
      <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.header}>
          <View style={styles.flex}>
            <Text
              style={[typography.titleL, { color: colors.textPrimary }]}
              accessibilityRole="header"
            >
              {finished ? text.rest.finished : text.rest.title}
            </Text>
            <Text style={[typography.bodyS, { color: colors.textSecondary }]} numberOfLines={1}>
              {rest.exerciseName}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={text.rest.minimize}
            onPress={onMinimize}
            style={styles.iconButton}
          >
            <Icon name="down" size={20} color={colors.textPrimary} />
          </Pressable>
        </View>
        <View style={styles.center}>
          <RestRing
            size={264}
            strokeWidth={10}
            progress={remainingMs / (rest.totalSeconds * 1000)}
            finished={finished}
          >
            <Text style={[typography.monoHero, { color: colors.textPrimary }]}>
              {countdown(remainingMs)}
            </Text>
            <Text style={[typography.bodyM, { color: colors.textSecondary }]}>
              {finished && nextSet !== null
                ? text.rest.readyForSet(nextSet)
                : text.rest.ofTotal(elapsed(rest.totalSeconds * 1000))}
            </Text>
          </RestRing>
          {!finished && (
            <View style={styles.chips}>
              <Chip label={text.rest.plus15} onPress={onAdd} />
              <Chip label={text.rest.restart} onPress={onRestart} />
            </View>
          )}
          <View style={[styles.card, rest.awaitingEffort && styles.cardAsking]}>
            <View style={styles.summary}>
              <Icon name="check" size={20} color={colors.textOk} />
              <Text style={[typography.bodyMBold, { color: colors.textPrimary }]}>
                {rest.setText}
              </Text>
            </View>
            <SetEffort set={rest.set} effortMode={effortMode} onEffort={onEffort} />
            {rest.awaitingEffort && (
              <Text style={[typography.bodyS, { color: colors.textSecondary }]}>
                {text.calibration.answerToContinue(rest.setNumber + 1)}
              </Text>
            )}
            {rest.calibrationNote && (
              <Text style={[typography.bodyS, { color: colors.textSecondary }]}>
                {rest.calibrationNote}
              </Text>
            )}
          </View>
          <Text style={[typography.bodyM, styles.next]}>{rest.nextText}</Text>
        </View>
        <View style={styles.bottom}>
          {finished ? (
            <Button variant="primary" size="xl" label={goLabel} onPress={onSkip} />
          ) : (
            <Button variant="secondary" size="xl" label={text.rest.skipRest} onPress={onSkip} />
          )}
        </View>
      </View>
    </Modal>
  );
}

/** Figma «Chip +15 s» and «Chip Reiniciar». */
export function Chip({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.chip}>
      <Text style={[typography.bodyMBold, { color: colors.textPrimary }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgBase },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 48,
    paddingLeft: space.s20,
    paddingRight: space.s8,
  },
  flex: { flex: 1 },
  iconButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.s20,
    paddingHorizontal: space.s16,
  },
  chips: { flexDirection: 'row', gap: space.s10 },
  chip: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: space.s14,
    borderRadius: radius.md,
    backgroundColor: colors.bgRaised,
  },
  card: {
    alignSelf: 'stretch',
    gap: space.s12,
    paddingVertical: space.s14,
    paddingHorizontal: space.s16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderHair,
    backgroundColor: colors.bgCard,
  },
  cardAsking: { borderColor: colors.borderAccentSoft, backgroundColor: colors.bgCurrent },
  summary: { flexDirection: 'row', alignItems: 'center', gap: space.s8 },
  next: { color: colors.textSecondary, textAlign: 'center' },
  bottom: { paddingTop: space.s8, paddingBottom: space.s12, paddingHorizontal: space.s16 },
});
