import { StyleSheet, View } from 'react-native';

import type { EffortMode } from '@/domain/models/vocabulary';
import type { WorkoutSet } from '@/domain/models/workout';
import { Segmented } from '@/presentation/components/choice/segmented';
import { Text } from '@/presentation/components/text';
import type { RirField } from '@/presentation/features/workout/set-form';
import { effortOptions, effortTitle } from '@/presentation/features/workout/set-sheet';
import { workout as text } from '@/presentation/strings/workout';
import { colors, space, typography } from '@/presentation/theme';

interface SetEffortProps {
  set: WorkoutSet;
  effortMode: EffortMode;
  onEffort: (set: WorkoutSet, field: RirField, rir: number) => void;
}

/**
 * Figma «EffortPicker» for a logged set (RF-ENT-02.AC4): one row, or one per side when the sides
 * differ (RF-ENT-03.AC2). The chosen answer stays marked.
 */
export function SetEffort({ set, effortMode, onEffort }: SetEffortProps) {
  const split = set.isUnilateral && set.repsLeft !== set.repsRight;
  const fields: RirField[] = split ? ['rirLeft', 'rirRight'] : ['rir'];
  const chosen = (field: RirField) => {
    if (!set.isUnilateral) return set.rir ?? -1;
    return (field === 'rirRight' ? set.rirRight : set.rirLeft) ?? -1;
  };

  return (
    <View style={styles.effort}>
      <Text style={[typography.bodyMStrong, { color: colors.textPrimary }]}>
        {effortTitle(effortMode)}
      </Text>
      {fields.map((field) => (
        <Segmented
          key={field}
          label={
            field === 'rirLeft'
              ? text.set.left
              : field === 'rirRight'
                ? text.set.right
                : effortTitle(effortMode)
          }
          options={effortOptions(effortMode)}
          selected={chosen(field)}
          onSelect={(rir) => onEffort(set, field, rir)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  effort: { gap: space.s8 },
});
