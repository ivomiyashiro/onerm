import { Pressable, StyleSheet, View } from 'react-native';

import type { EffortMode, LoadUnit } from '@/domain/models/vocabulary';
import type { WorkoutSet } from '@/domain/models/workout';
import { toUnit } from '@/domain/rules/units';
import { Segmented } from '@/presentation/components/choice/segmented';
import { Icon } from '@/presentation/components/icons/icon';
import { Text } from '@/presentation/components/text';
import type { RirField } from '@/presentation/features/workout/set-form';
import { effortOptions, effortTitle } from '@/presentation/features/workout/set-sheet';
import type { SetRowView } from '@/presentation/features/workout/use-workout-view-model';
import { common } from '@/presentation/strings/common';
import { loadNumber } from '@/presentation/strings/numbers';
import { workout as text } from '@/presentation/strings/workout';
import { colors, radius, space, typography } from '@/presentation/theme';

interface SetRowProps {
  row: SetRowView;
  /** Null for bodyweight: no load is shown. */
  unit: LoadUnit | null;
  effortMode: EffortMode;
  /** The current row opens «Ajustar serie»; a done one opens «Editar serie». */
  onPress: () => void;
  onEffort: (set: WorkoutSet, field: RirField, rir: number) => void;
}

/**
 * Figma «SetRow» (≥ 60 dp): pending in grey, current with the lime index and «Tocá para ajustar»,
 * done with a check (warm-ups dimmed with a «C»), tapped to edit (RF-ENT-04).
 */
export function SetRow({ row, unit, effortMode, onPress, onEffort }: SetRowProps) {
  const current = row.kind === 'current';
  const done = row.kind === 'done' ? row.set : null;
  const warmUp = done?.isWarmup ?? false;
  const muted = row.kind === 'pending';
  // A calibration set asks its effort below the list, not in the row (RF-SUG-02.AC4).
  const missing = row.kind === 'done' && row.missingEffort;
  const asking = row.kind === 'done' && row.askEffort && !missing;
  const loadKg = done ? done.loadKg : row.kind === 'done' ? null : row.values.loadKg;
  const reps = done
    ? done.isUnilateral
      ? done.repsLeft === done.repsRight
        ? text.set.timesReps(done.repsLeft)
        : text.set.sideReps(done.repsLeft, done.repsRight)
      : text.set.timesReps(done.reps)
    : text.set.timesReps(row.kind === 'done' ? 0 : row.values.reps);
  const valueColor = muted ? colors.textSecondary : colors.textPrimary;
  const effort = done && !asking && !missing ? effortLabel(done, effortMode) : '';
  // RNF-18: the check and the «C» say nothing to TalkBack, and «5», «kg» would be read apart.
  const name = [
    done
      ? warmUp
        ? text.set.rowName.warmUpDone
        : text.set.rowName.done(row.number)
      : text.set.rowName.set(row.number),
    unit !== null &&
      loadKg !== null &&
      `${loadNumber(toUnit(loadKg, unit), unit)} ${common.units[unit]}`,
    reps,
    missing && text.calibration.missingEffort,
    effort,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <View style={[styles.wrap, asking && styles.asking]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={name}
        accessibilityHint={current ? text.set.tapToAdjust : undefined}
        disabled={muted}
        onPress={onPress}
        style={[
          styles.row,
          (current || missing) && styles.current,
          missing && styles.missing,
          warmUp && styles.warmUp,
        ]}
      >
        <View style={[styles.index, current && styles.indexCurrent, warmUp && styles.indexWarmUp]}>
          {done && !warmUp ? (
            <Icon name="check" size={18} color={colors.textOk} />
          ) : (
            <Text
              style={[
                typography.bodyMStrong,
                { color: current ? colors.textOnAccent : colors.textSecondary },
              ]}
            >
              {warmUp ? text.set.warmUpIndex : String(row.number)}
            </Text>
          )}
        </View>
        <View style={styles.value}>
          {unit !== null && (
            <>
              <Text style={[typography.numberM, { color: valueColor }]}>
                {loadKg === null ? text.set.noLoadInRow : loadNumber(toUnit(loadKg, unit), unit)}
              </Text>
              {loadKg !== null && (
                <Text style={[typography.bodyMStrong, { color: colors.textSecondary }]}>
                  {common.units[unit]}
                </Text>
              )}
            </>
          )}
          <Text style={[typography.numberM, { color: valueColor }]}>{reps}</Text>
        </View>
        {current && (
          <Text style={[typography.bodyS, { color: colors.textPrimary }]}>
            {text.set.tapToAdjust}
          </Text>
        )}
        {missing && (
          <Text style={[typography.bodyS, { color: colors.textPrimary }]}>
            {text.calibration.missingEffort}
          </Text>
        )}
        {effort !== '' && (
          <Text style={[typography.bodyS, { color: colors.textSecondary }]}>{effort}</Text>
        )}
      </Pressable>
      {done && asking && (
        <View style={styles.effort}>
          <Text style={[typography.bodyMStrong, { color: colors.textPrimary }]}>
            {effortTitle(effortMode)}
          </Text>
          {done.isUnilateral && done.repsLeft !== done.repsRight ? (
            (['rirLeft', 'rirRight'] as const).map((field) => (
              <View key={field} style={styles.side}>
                <Text style={[typography.label, styles.sideLabel]}>
                  {field === 'rirLeft' ? text.set.left : text.set.right}
                </Text>
                <View style={styles.flex}>
                  <Segmented
                    label={field === 'rirLeft' ? text.set.left : text.set.right}
                    options={effortOptions(effortMode)}
                    selected={done[field] ?? -1}
                    onSelect={(rir) => onEffort(done, field, rir)}
                  />
                </View>
              </View>
            ))
          ) : (
            <Segmented
              label={effortTitle(effortMode)}
              options={effortOptions(effortMode)}
              selected={-1}
              onSelect={(rir) => onEffort(done, 'rir', rir)}
            />
          )}
        </View>
      )}
    </View>
  );
}

/** The short effort of a logged set (13 §10): «2 o 3 más», or «reserva 2» with the RIR scale. */
function effortLabel(set: WorkoutSet, mode: EffortMode): string {
  const rir = set.isUnilateral ? set.rirLeft : set.rir;
  if (rir === null) return '';
  if (mode === 'rir') return text.effort.rowRir(rir);
  if (rir === 0) return text.effort.row.none;
  if (rir === 1) return text.effort.row.one;
  if (rir <= 3) return text.effort.row.twoOrThree;
  return text.effort.row.fourOrMore;
}

const INDEX = 36;

const styles = StyleSheet.create({
  wrap: { borderRadius: 16 },
  asking: {
    borderWidth: 1,
    borderColor: colors.borderHair,
    backgroundColor: colors.bgCard,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s12,
    minHeight: 60,
    paddingVertical: space.s10,
    paddingHorizontal: space.s14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderHair,
    backgroundColor: colors.bgCard,
  },
  current: { borderColor: colors.borderAccentSoft, backgroundColor: colors.bgCurrent },
  missing: { backgroundColor: colors.bgCard },
  warmUp: { opacity: 0.6 },
  index: {
    width: INDEX,
    height: INDEX,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: colors.bgRaised,
  },
  indexCurrent: { backgroundColor: colors.bgAccent },
  indexWarmUp: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.borderControl,
  },
  value: { flex: 1, flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  effort: { gap: space.s8, padding: space.s14, paddingTop: space.s10 },
  side: { flexDirection: 'row', alignItems: 'center', gap: space.s8 },
  sideLabel: { width: 32, color: colors.textSecondary },
  flex: { flex: 1 },
});
