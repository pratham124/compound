import Animated, { type CSSAnimationKeyframes } from 'react-native-reanimated';
import Svg, { Circle, Ellipse, G, Path, type EllipseProps } from 'react-native-svg';

import { motion, type Palette } from '../theme/tokens.ts';

export type MochiProps = {
  palette: Palette;
  width: number;
  height: number;
  blinking: boolean;
};

const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);

const EYE_RADIUS = 2.2;

// One blink just after the hop lands, then one every loop.
const BLINK: CSSAnimationKeyframes<EllipseProps> = {
  '0%': { ry: EYE_RADIUS },
  '17%': { ry: EYE_RADIUS },
  '19%': { ry: 0.3 },
  '21%': { ry: EYE_RADIUS },
  '100%': { ry: EYE_RADIUS },
};

const BODY =
  'M27 7 C41 7 50.5 17.5 51.5 30 C52.3 40 46 46 27 46 C8 46 1.7 40 2.5 30 C3.5 17.5 13 7 27 7 Z';

const SHADE =
  'M3.2 34 C5.5 42 13 46 27 46 C41 46 48.5 42 50.8 34 C47 40.5 39 43 27 43 C15 43 7 40.5 3.2 34 Z';

export function Mochi({ palette, width, height, blinking }: MochiProps) {
  const blink = {
    animationName: blinking ? BLINK : 'none',
    animationDuration: motion.mochiBlinkLoopMs,
    animationIterationCount: 'infinite',
  } as const;

  return (
    <Svg width={width} height={height} viewBox="0 6 54 42" accessible={false} importantForAccessibility="no-hide-descendants">
      <Path d={BODY} fill={palette.char} stroke={palette.charEdge} strokeWidth={1} />
      <Path d={SHADE} fill={palette.charEdge} opacity={0.35} />
      <Ellipse cx={17} cy={16.5} rx={6.5} ry={3} rotation={-28} origin="17, 16.5" fill="#fff" opacity={0.6} />
      <Circle cx={31} cy={11.5} r={0.9} fill="#fff" opacity={0.6} />
      <Circle cx={36} cy={13.8} r={0.7} fill="#fff" opacity={0.55} />
      <Circle cx={27.5} cy={13.6} r={0.6} fill="#fff" opacity={0.5} />
      <G>
        <AnimatedEllipse cx={20.5} cy={28.5} rx={EYE_RADIUS} ry={EYE_RADIUS} fill={palette.eyes} animatedProps={blink} />
        <AnimatedEllipse cx={33.5} cy={28.5} rx={EYE_RADIUS} ry={EYE_RADIUS} fill={palette.eyes} animatedProps={blink} />
      </G>
      <Ellipse cx={14.5} cy={32.5} rx={3.6} ry={2.1} fill={palette.blush} opacity={0.55} />
      <Ellipse cx={39.5} cy={32.5} rx={3.6} ry={2.1} fill={palette.blush} opacity={0.55} />
      <Path d="M25.2 32.3 Q27 34.1 28.8 32.3" stroke={palette.eyes} strokeWidth={1.5} fill="none" strokeLinecap="round" />
    </Svg>
  );
}
