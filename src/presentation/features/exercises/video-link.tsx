import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/presentation/components/button/button';
import { Text } from '@/presentation/components/text';
import { catalog } from '@/presentation/strings/catalog';
import { colors, space, typography } from '@/presentation/theme';
import { useUseCases } from '@/presentation/use-cases/use-cases-context';

/** RF-CAT-02 AC5: the video the team chose or, without one, a YouTube search for the exercise. */
export function videoUrl(exerciseName: string, curated: string | null): string {
  return (
    curated ??
    `https://www.youtube.com/results?search_query=${encodeURIComponent(catalog.detail.videoSearch(exerciseName))}`
  );
}

/**
 * True once the device reports it has no connection (RF-CAT-02 AC6). Until it reports anything the
 * video stays available: the app may have started online, which isn't reported as a reconnection.
 */
function useIsOffline(): boolean {
  const { observeSyncActivity } = useUseCases();
  const [offline, setOffline] = useState(false);
  // A boolean: React skips the render when it didn't change.
  useEffect(
    () => observeSyncActivity.execute(({ online }) => setOffline(online === false)),
    [observeSyncActivity],
  );
  return offline;
}

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
  const offline = useIsOffline();
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
