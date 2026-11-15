import { useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import Animated, { cubicBezier, useReducedMotion, type CSSAnimationKeyframes } from 'react-native-reanimated';

import { motion, press, type Palette } from '../theme/tokens.ts';
import type { Scheme } from '../theme/useAppearance.ts';
import { Mochi } from './Mochi.tsx';

export type BrandTileProps = {
  palette: Palette;
  scheme: Scheme;
};

type MochiMove = { kind: 'hop' } | { kind: 'boop'; count: number };

const SIZE = 128;
const LIGHT_ICON = require('../../../../docs/brand/app-icon/icon.png');
const DARK_ICON = require('../../../../docs/brand/app-icon/icon-dark.png');

const rest = { translateY: 0, rotate: '0deg', scaleX: 1, scaleY: 1 } as const;

function pose({ translateY, rotate, scaleX, scaleY }: { translateY: number; rotate: string; scaleX: number; scaleY: number }) {
  return [{ translateY }, { rotate }, { scaleX }, { scaleY }];
}

// Out from behind the tile: stretch on the way up, squash on landing, then a little head tilt.
const HOP: CSSAnimationKeyframes = {
  '0%': { opacity: 0, transform: pose({ translateY: 16, rotate: '0deg', scaleX: 0.9, scaleY: 0.9 }) },
  '35%': { opacity: 1, transform: pose({ translateY: -6, rotate: '0deg', scaleX: 0.94, scaleY: 1.08 }) },
  '55%': { transform: pose({ translateY: 0, rotate: '0deg', scaleX: 1.08, scaleY: 0.92 }) },
  '72%': { transform: pose({ translateY: 0, rotate: '-8deg', scaleX: 0.98, scaleY: 1.02 }) },
  '86%': { transform: pose({ translateY: 0, rotate: '5deg', scaleX: 1, scaleY: 1 }) },
  '100%': { opacity: 1, transform: pose(rest) },
};

const BOOP: CSSAnimationKeyframes = {
  '0%': { transform: pose(rest) },
  '25%': { transform: pose({ translateY: 0, rotate: '0deg', scaleX: 1.1, scaleY: 0.88 }) },
  '50%': { transform: pose({ translateY: -6, rotate: '0deg', scaleX: 0.94, scaleY: 1.08 }) },
  '70%': { transform: pose({ translateY: 0, rotate: '-6deg', scaleX: 1, scaleY: 1 }) },
  '85%': { transform: pose({ translateY: 0, rotate: '4deg', scaleX: 1, scaleY: 1 }) },
  '100%': { transform: pose(rest) },
};

const FADE: CSSAnimationKeyframes = { '0%': { opacity: 0 }, '100%': { opacity: 1 } };

const easeOut = cubicBezier(...press.easing);

/** The clay app icon with the mochi peeking from its bottom-right corner. */
export function BrandTile({ palette, scheme }: BrandTileProps) {
  const reduceMotion = useReducedMotion();
  const [move, setMove] = useState<MochiMove>({ kind: 'hop' });

  const animation = reduceMotion
    ? { animationName: FADE, animationDuration: motion.mochiFadeMs }
    : move.kind === 'hop'
      ? { animationName: HOP, animationDuration: motion.mochiHopMs }
      : { animationName: BOOP, animationDuration: motion.mochiBoopMs };

  return (
    <View style={styles.wrap}>
      <Image source={scheme === 'dark' ? DARK_ICON : LIGHT_ICON} style={styles.tile} accessibilityIgnoresInvertColors />
      <Pressable
        style={styles.mochi}
        hitSlop={8}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        disabled={reduceMotion}
        onPress={() => setMove((current) => ({ kind: 'boop', count: current.kind === 'boop' ? current.count + 1 : 1 }))}
      >
        <Animated.View
          // A new key remounts the view, which is what restarts a CSS animation on each tap.
          key={move.kind === 'hop' ? 'hop' : `boop-${move.count}`}
          style={[styles.squish, animation, { animationTimingFunction: easeOut }]}
        >
          <Mochi palette={palette} width={32} height={30} blinking={!reduceMotion} />
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: SIZE, height: SIZE },
  tile: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE * 0.2237,
    shadowColor: '#141820',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 7,
  },
  mochi: { position: 'absolute', right: -18, bottom: -12 },
  squish: { transformOrigin: 'center bottom' },
});
