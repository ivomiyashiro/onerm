import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { Exercise } from '@/domain/models/exercise';
import { BottomSheet } from '@/presentation/components/overlay/bottom-sheet';
import { ExerciseTechnique } from '@/presentation/features/exercises/exercise-technique';
import { MachinePicture } from '@/presentation/features/exercises/machine-picture';
import { VideoLink } from '@/presentation/features/exercises/video-link';
import { common } from '@/presentation/strings/common';
import { space } from '@/presentation/theme';

/**
 * S26 «Cómo se hace» (RF-CAT-02 AC7, Figma «S09 · Cómo se hace (hoja)»): S17's help without the
 * muscles or the progress, so the workout isn't left to look it up.
 */
export function HowToSheet({
  exercise,
  onOpenVideo,
  onClose,
}: {
  /** Null while closed. */
  exercise: Exercise | null;
  onOpenVideo: (url: string) => void;
  onClose: () => void;
}) {
  // The last exercise stays while the sheet slides away.
  const [shown, setShown] = useState(exercise);
  if (exercise !== null && exercise !== shown) setShown(exercise);
  // Closed before it was ever opened: nothing to show, not even an empty sheet.
  if (shown === null) return null;

  return (
    <BottomSheet
      visible={exercise !== null}
      title={shown.name}
      closeLabel={common.close}
      onClose={onClose}
      scrollContent
    >
      <View style={styles.content}>
        {shown.machine !== null && <MachinePicture machine={shown.machine} height={150} />}
        {shown.technique !== null && <ExerciseTechnique technique={shown.technique} />}
        <VideoLink exerciseName={shown.name} curatedUrl={shown.videoUrl} onOpen={onOpenVideo} />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: { gap: space.s16, paddingBottom: space.s4 },
});
