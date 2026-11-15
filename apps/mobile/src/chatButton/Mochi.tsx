import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';

import { chatButton, type Palette } from '../theme/tokens.ts';
import { blinkAnimation } from './blink.ts';

const BODY =
  'M27 7 C41 7 50.5 17.5 51.5 30 C52.3 40 46 46 27 46 C8 46 1.7 40 2.5 30 C3.5 17.5 13 7 27 7 Z';

const SHADE = 'M3.2 34 C5.5 42 13 46 27 46 C41 46 48.5 42 50.8 34 C47 40.5 39 43 27 43 C15 43 7 40.5 3.2 34 Z';
const EYE_CENTERS = [20.5, 33.5] as const;
const EYE_Y = 28.5;
const EYE_RADIUS = 2.2;
const BLUSH_OFFSET_X = 6;
const BLUSH_OFFSET_Y = 4;
const BLUSH_CENTERS_X = [EYE_CENTERS[0] - BLUSH_OFFSET_X, EYE_CENTERS[1] + BLUSH_OFFSET_X] as const;

export type MochiProps = {
  palette: Palette;
  blink: boolean;
};

export function Mochi({ palette, blink }: MochiProps) {
  return (
    <View style={styles.box} pointerEvents="none">
      <Svg width={chatButton.width} height={chatButton.height} viewBox={`0 0 ${chatButton.width} ${chatButton.height}`}>
        <Path d={BODY} fill={palette.char} stroke={palette.charEdge} strokeWidth={1} />
        <Path d={SHADE} fill={palette.charEdge} opacity={0.35} />
        <Ellipse cx={17} cy={16.5} rx={6.5} ry={3} rotation={-28} origin="17, 16.5" fill={chatButton.highlight} opacity={0.6} />
        <Circle cx={31} cy={11.5} r={0.9} fill={chatButton.highlight} opacity={0.6} />
        <Circle cx={36} cy={13.8} r={0.7} fill={chatButton.highlight} opacity={0.55} />
        <Circle cx={27.5} cy={13.6} r={0.6} fill={chatButton.highlight} opacity={0.5} />
        {BLUSH_CENTERS_X.map((cx) => (
          <Ellipse key={cx} cx={cx} cy={EYE_Y + BLUSH_OFFSET_Y} rx={3.6} ry={2.1} fill={palette.blush} opacity={0.55} />
        ))}
        <Path d="M25.2 32.3 Q27 34.1 28.8 32.3" stroke={palette.eyes} strokeWidth={1.5} fill="none" strokeLinecap="round" />
      </Svg>
      {EYE_CENTERS.map((cx) => (
        <Animated.View
          key={cx}
          style={[
            styles.eye,
            { left: cx - EYE_RADIUS, top: EYE_Y - EYE_RADIUS, backgroundColor: palette.eyes },
            blink ? blinkAnimation : null,
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { width: chatButton.width, height: chatButton.height },
  eye: {
    position: 'absolute',
    width: EYE_RADIUS * 2,
    height: EYE_RADIUS * 2,
    borderRadius: EYE_RADIUS,
  },
});
