import { StyleSheet, View } from 'react-native';

import type { WorkoutSet } from '@/domain/models/workout';
import { Text } from '@/presentation/components/text';
import { SetEffort } from '@/presentation/features/workout/set-effort';
import type { WorkoutContent } from '@/presentation/features/workout/use-workout-view-model';
import type { RirField } from '@/presentation/shared/set/set-form';
import { workout as text } from '@/presentation/strings/workout';
import { colors, space, typography } from '@/presentation/theme';

/**
 * RF-SUG-02.AC4 (Figma «S09 · Calibración»): the effort of a calibration set, required before the
 * next one; one row per side when the sides differ.
 */
export function CalibrationEffort({
  waiting,
  effortMode,
  onEffort,
}: {
  waiting: NonNullable<WorkoutContent['awaitingEffort']>;
  effortMode: WorkoutContent['effortMode'];
  onEffort: (set: WorkoutSet, field: RirField, rir: number) => void;
}) {
  return (
    <View style={styles.effort}>
      <SetEffort set={waiting.set} effortMode={effortMode} onEffort={onEffort} />
      <Text style={[typography.bodyM, { color: colors.textSecondary }]}>
        {text.calibration.askEffortForSet(waiting.number)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  effort: { gap: space.s10, paddingBottom: space.s8 },
});
