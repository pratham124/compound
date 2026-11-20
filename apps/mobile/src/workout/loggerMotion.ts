import { cubicBezier, Easing, LinearTransition, ReduceMotion } from 'react-native-reanimated';

import { press } from '../theme/tokens.ts';

export const ARM_COLOUR_MS = 120;
export const FLASH_MS = 700;
export const ROW_EXIT_MS = 150;
export const ROW_SLIDE_MS = 200;

export const closeGap = LinearTransition.duration(200).easing(Easing.bezier(...press.easing)).reduceMotion(ReduceMotion.System);

// Width is animated rather than scaleX because the fill is absolutely positioned with no children, so nothing re-lays out, and scaleX would squash its rounded ends.
export const progressGrow = {
  transitionProperty: 'width',
  transitionDuration: 250,
  transitionTimingFunction: cubicBezier(...press.easing),
} as const;

export const ringFade = {
  transitionProperty: 'opacity',
  transitionDuration: 150,
  transitionTimingFunction: cubicBezier(...press.easing),
} as const;

export const upNextColour = {
  transitionProperty: 'color',
  transitionDuration: 150,
  transitionTimingFunction: 'ease',
} as const;

export const colourEase = Easing.bezier(0.25, 0.1, 0.25, 1);
