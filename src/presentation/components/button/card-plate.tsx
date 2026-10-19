import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { ClipPath, Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { colors } from '@/presentation/theme';

/** The cut corners: 16 on the 64 high button, a bit more at card size. */
const CUT = 28;
/** The striped band on the right, like the button's right piece (34 of 343). */
const STRIPES_WIDTH = 32;
/** The button's stripes: 45°, 7.07 thick every 14.14 (Figma «plate-right»). */
const STRIPE = 7.07;
const STRIPE_STEP = 14.14;

/**
 * The primary button's plate at card size (#225): the top-left and bottom-right corners cut,
 * the brand's lime gradient and the stripes down the right edge. It measures its box and draws
 * behind the content.
 */
export function CardPlate() {
  const [box, setBox] = useState({ width: 0, height: 0 });
  const { width: w, height: h } = box;

  const outline = `M${CUT} 0H${w}V${h - CUT}L${w - CUT} ${h}H0V${CUT}Z`;
  // Each stripe is the band between the lines x + y = t and x + y = t + STRIPE.
  const stripes: string[] = [];
  for (let t = w - STRIPES_WIDTH - STRIPE; t < w + h; t += STRIPE_STEP) {
    stripes.push(`M${t} 0H${t + STRIPE}L${t + STRIPE - h} ${h}H${t - h}Z`);
  }

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      onLayout={({ nativeEvent: { layout } }) => {
        if (layout.width !== w || layout.height !== h) {
          setBox({ width: layout.width, height: layout.height });
        }
      }}
    >
      {w > 0 && (
        <Svg width={w} height={h}>
          <Defs>
            <LinearGradient id="card-plate" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colors.bgAccentTop} />
              <Stop offset="0.48" stopColor={colors.bgAccent} />
              <Stop offset="1" stopColor={colors.bgAccentBottom} />
            </LinearGradient>
            <ClipPath id="card-plate-outline">
              <Path d={outline} />
            </ClipPath>
            <ClipPath id="card-plate-band">
              <Rect x={w - STRIPES_WIDTH} y={0} width={STRIPES_WIDTH} height={h} />
            </ClipPath>
          </Defs>
          <Path d={outline} fill="url(#card-plate)" />
          <G clipPath="url(#card-plate-outline)">
            <G clipPath="url(#card-plate-band)">
              <Path d={stripes.join('')} fill={colors.textOnAccent} fillOpacity={0.16} />
            </G>
          </G>
        </Svg>
      )}
    </View>
  );
}
