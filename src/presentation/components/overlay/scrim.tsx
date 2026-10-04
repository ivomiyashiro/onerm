import { Pressable, StyleSheet } from 'react-native';

import { colors } from '@/presentation/theme';

/**
 * Figma «Scrim»: dims the screen behind a sheet or a dialog. The Figma background blur is left
 * out (it needs a native blur view); the 74 % black alone keeps the contrast.
 */
export function Scrim({ onPress, testID }: { onPress?: () => void; testID?: string }) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessible={false}
      style={[StyleSheet.absoluteFill, { backgroundColor: colors.bgScrim }]}
    />
  );
}
