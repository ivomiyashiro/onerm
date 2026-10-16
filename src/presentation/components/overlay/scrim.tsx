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
      // Out of the accessibility tree: TalkBack focused it as a button with no name (RNF-18).
      // The sheet or dialog closes with its own button or with Back.
      accessible={false}
      importantForAccessibility="no"
      accessibilityElementsHidden
      style={[StyleSheet.absoluteFill, { backgroundColor: colors.bgScrim }]}
    />
  );
}
