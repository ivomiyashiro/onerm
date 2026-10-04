import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import LeftMDisabled from '@/presentation/components/button/svg/plate-left-m-disabled.svg';
import LeftM from '@/presentation/components/button/svg/plate-left-m.svg';
import LeftXlDisabled from '@/presentation/components/button/svg/plate-left-xl-disabled.svg';
import LeftXl from '@/presentation/components/button/svg/plate-left-xl.svg';
import RightMDisabled from '@/presentation/components/button/svg/plate-right-m-disabled.svg';
import RightM from '@/presentation/components/button/svg/plate-right-m.svg';
import RightXlDisabled from '@/presentation/components/button/svg/plate-right-xl-disabled.svg';
import RightXl from '@/presentation/components/button/svg/plate-right-xl.svg';
import { colors } from '@/presentation/theme';

const PIECES = {
  m: { height: 56, Left: LeftM, Right: RightM, LeftOff: LeftMDisabled, RightOff: RightMDisabled },
  xl: {
    height: 64,
    Left: LeftXl,
    Right: RightXl,
    LeftOff: LeftXlDisabled,
    RightOff: RightXlDisabled,
  },
};

/**
 * Background of the primary button: the cut corner on the left and the brand stripes on the
 * right are the Figma vectors; the middle stretches with the button width.
 */
export function PrimaryPlate({ size, disabled }: { size: 'm' | 'xl'; disabled: boolean }) {
  const { height, Left, Right, LeftOff, RightOff } = PIECES[size];
  const [LeftPiece, RightPiece] = disabled ? [LeftOff, RightOff] : [Left, Right];

  return (
    <View style={styles.plate} pointerEvents="none">
      <LeftPiece height={height} />
      <View style={styles.middle}>
        {disabled ? (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bgField }]} />
        ) : (
          <Svg width="100%" height={height} preserveAspectRatio="none">
            <Defs>
              <LinearGradient id="accent" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={colors.bgAccentTop} />
                <Stop offset="0.48" stopColor={colors.bgAccent} />
                <Stop offset="1" stopColor={colors.bgAccentBottom} />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#accent)" />
          </Svg>
        )}
      </View>
      <RightPiece height={height} />
    </View>
  );
}

const styles = StyleSheet.create({
  // The middle overlaps the pieces (x 12–311 of 343 in Figma), so no seam shows between them.
  plate: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, flexDirection: 'row' },
  middle: { flex: 1, marginLeft: -1, marginRight: -2 },
});
