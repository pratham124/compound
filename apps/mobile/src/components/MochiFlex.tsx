import { useEffect } from 'react';
import * as Haptics from 'expo-haptics';
import { StyleSheet, View } from 'react-native';
import Animated, { cubicBezier, useReducedMotion, type CSSAnimationKeyframes } from 'react-native-reanimated';
import Svg, { Circle, G, Path } from 'react-native-svg';

import { motion, press, type Palette } from '../theme/tokens.ts';
import { Mochi } from './Mochi.tsx';

export type MochiFlexProps = {
  palette: Palette;
  play: boolean;
};

type Side = 'left' | 'right';

type FlexMode = 'idle' | 'flex' | 'fade';

const easeOut = cubicBezier(...press.easing);
const easeInOut = cubicBezier(...motion.segmentSlideEasing);

const HANG = { right: '90deg', left: '-90deg' } as const;

const loopDelay = motion.mochiFlexDelayMs + motion.mochiFlexMs;

function body(scaleX: number, scaleY: number) {
  return [{ scaleX }, { scaleY }];
}

const FLEX_BODY: CSSAnimationKeyframes = {
  '0%': { transform: body(1, 1) },
  '25%': { transform: body(1.04, 0.94) },
  '65%': { transform: body(0.98, 1.04) },
  '100%': { transform: body(1, 1) },
};

// A keyframe's timing function eases the segment that starts there.
const PUMP_BODY: CSSAnimationKeyframes = {
  '0%': { transform: body(1, 1), animationTimingFunction: easeInOut },
  '18%': { transform: body(0.99, 1.02), animationTimingFunction: easeInOut },
  '36%': { transform: body(1, 1), animationTimingFunction: easeInOut },
  '54%': { transform: body(0.99, 1.02), animationTimingFunction: easeInOut },
  '72%': { transform: body(1, 1) },
  '100%': { transform: body(1, 1) },
};

function raiseArm(side: Side): CSSAnimationKeyframes {
  const hang = HANG[side];

  return {
    '0%': { opacity: 0, transform: [{ rotate: hang }] },
    '25%': { opacity: 0, transform: [{ rotate: hang }] },
    '30%': { opacity: 1 },
    '100%': { opacity: 1, transform: [{ rotate: '0deg' }] },
  };
}

const RAISE_ARM = { left: raiseArm('left'), right: raiseArm('right') } as const;

const PUMP_ARM: CSSAnimationKeyframes = {
  '0%': { transform: [{ scale: 1 }], animationTimingFunction: easeInOut },
  '18%': { transform: [{ scale: 1.12 }], animationTimingFunction: easeInOut },
  '36%': { transform: [{ scale: 1 }], animationTimingFunction: easeInOut },
  '54%': { transform: [{ scale: 1.12 }], animationTimingFunction: easeInOut },
  '72%': { transform: [{ scale: 1 }] },
  '100%': { transform: [{ scale: 1 }] },
};

const ARM_FADE: CSSAnimationKeyframes = { '0%': { opacity: 0 }, '100%': { opacity: 1 } };

// Spans two pump loops, so the drop falls on every other second pump.
const SWEAT_DRIP: CSSAnimationKeyframes = {
  '0%': { opacity: 0, transform: [{ translateY: 0 }] },
  '27%': { opacity: 0, transform: [{ translateY: 0 }] },
  '28.5%': { opacity: 1, transform: [{ translateY: 0 }] },
  '37.5%': { opacity: 1, transform: [{ translateY: 4 }] },
  '43%': { opacity: 0, transform: [{ translateY: 6 }] },
  '100%': { opacity: 0, transform: [{ translateY: 6 }] },
};

const ARM_PATH = 'M0 14 C2 9.5 9 9.5 11 13 L12.5 6 C12.5 2.5 18.5 2.5 18.5 6 L18 16 C18 19.5 15.5 20.5 12 20.5 L0 20 Z';
const SWEAT_PATH = 'M5 0 C5 0 0 6.5 0 9 C0 11.8 2.2 14 5 14 C7.8 14 10 11.8 10 9 C10 6.5 5 0 5 0 Z';

const loop = {
  animationDuration: motion.mochiPumpLoopMs,
  animationDelay: loopDelay,
  animationIterationCount: 'infinite',
} as const;

function armStyle(side: Side, mode: FlexMode) {
  switch (mode) {
    case 'flex':
      return {
        animationName: RAISE_ARM[side],
        animationDuration: motion.mochiFlexMs,
        animationDelay: motion.mochiFlexDelayMs,
        animationTimingFunction: easeOut,
        animationFillMode: 'both',
      } as const;
    case 'fade':
      return {
        animationName: ARM_FADE,
        animationDuration: motion.mochiFadeMs,
        animationDelay: motion.mochiFlexDelayMs,
        animationTimingFunction: easeOut,
        animationFillMode: 'both',
        transform: [{ rotate: '0deg' }],
      } as const;
    case 'idle':
      return { opacity: 0, transform: [{ rotate: HANG[side] }] } as const;
    default: {
      const _exhaustive: never = mode;

      return _exhaustive;
    }
  }
}

/** The mochi flexing on Workout done, then pumping until the screen closes. The box is a fixed 80pt wide so the arms appearing never shifts the title beside it. */
export function MochiFlex({ palette, play }: MochiFlexProps) {
  const reduceMotion = useReducedMotion();
  const mode: FlexMode = !play ? 'idle' : reduceMotion ? 'fade' : 'flex';
  const moving = mode === 'flex';

  useEffect(() => {
    if (!play) {
      return;
    }

    const id = setTimeout(() => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, motion.mochiFlexDelayMs + motion.mochiFlexMs);

    return () => clearTimeout(id);
  }, [play]);

  const raiseBody = moving
    ? { animationName: FLEX_BODY, animationDuration: motion.mochiFlexMs, animationDelay: motion.mochiFlexDelayMs, animationTimingFunction: easeOut } as const
    : null;

  const pumpBody = moving ? { animationName: PUMP_BODY, ...loop } : null;
  const pumpArm = moving ? { animationName: PUMP_ARM, ...loop } : null;

  return (
    <View style={styles.box} accessible={false} importantForAccessibility="no-hide-descendants">
      <Animated.View style={[styles.body, raiseBody]}>
        <Animated.View style={[styles.bodyOrigin, pumpBody]}>
          <Mochi palette={palette} width={52} height={48} blinking={false} />
        </Animated.View>
      </Animated.View>
      <Animated.View style={[styles.arm, styles.armLeft, armStyle('left', mode)]}>
        <Animated.View style={[styles.armLeftOrigin, pumpArm]}>
          <Svg width={18} height={22} viewBox="0 0 20 24" accessible={false}>
            <G transform="translate(20 0) scale(-1 1)">
              <Path d={ARM_PATH} fill={palette.char} stroke={palette.charEdge} strokeWidth={1} strokeLinejoin="round" />
            </G>
          </Svg>
        </Animated.View>
      </Animated.View>
      <Animated.View style={[styles.arm, styles.armRight, armStyle('right', mode)]}>
        <Animated.View style={[styles.armRightOrigin, pumpArm]}>
          <Svg width={18} height={22} viewBox="0 0 20 24" accessible={false}>
            <Path d={ARM_PATH} fill={palette.char} stroke={palette.charEdge} strokeWidth={1} strokeLinejoin="round" />
          </Svg>
        </Animated.View>
      </Animated.View>
      {moving ? (
        <Animated.View style={[styles.sweat, { animationName: SWEAT_DRIP, animationTimingFunction: easeOut, ...loop, animationDuration: motion.mochiPumpLoopMs * 2 }]}>
          <Svg width={5} height={7} viewBox="0 0 10 14" accessible={false}>
            <Path d={SWEAT_PATH} fill={palette.sweat} stroke={palette.sweatEdge} strokeWidth={1} />
            <Circle cx={3.4} cy={9.4} r={1.1} fill="#fff" opacity={0.7} />
          </Svg>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { width: 80, height: 48 },
  body: { position: 'absolute', left: 14, top: 0, transformOrigin: 'center bottom' },
  bodyOrigin: { transformOrigin: 'center bottom' },
  arm: { position: 'absolute', top: 14, width: 18, height: 22 },
  armLeft: { left: 0, transformOrigin: '100% 75%' },
  armRight: { left: 62, transformOrigin: '0% 75%' },
  armLeftOrigin: { transformOrigin: '100% 75%' },
  armRightOrigin: { transformOrigin: '0% 75%' },
  // Hidden while its loop waits for the flex to finish.
  sweat: { position: 'absolute', left: 58, top: 6, opacity: 0 },
});
