import { StyleSheet, View } from 'react-native';

import { Button } from '@/presentation/components/button/button';
import { Text } from '@/presentation/components/text';
import { useVideoLinkViewModel } from '@/presentation/features/exercises/use-video-link-view-model';
import { videoUrl } from '@/presentation/features/exercises/video-url';
import { catalog } from '@/presentation/strings/catalog';
import { colors, space, typography } from '@/presentation/theme';

/** «Ver un video» (RF-CAT-02 AC5, AC6): the only part of the help that needs a connection. */
export function VideoLink({
  exerciseName,
  curatedUrl,
  onOpen,
}: {
  exerciseName: string;
  curatedUrl: string | null;
  onOpen: (url: string) => void;
}) {
  const { offline } = useVideoLinkViewModel();
  return (
    <View style={styles.video}>
      <Button
        variant="secondary"
        label={catalog.detail.video}
        icon="arrow"
        disabled={offline}
        onPress={() => onOpen(videoUrl(exerciseName, curatedUrl))}
      />
      <Text style={[typography.bodyS, { color: colors.textTertiary }]}>
        {offline ? catalog.detail.videoOffline : catalog.detail.videoOnline}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  video: { gap: space.s8 },
});
