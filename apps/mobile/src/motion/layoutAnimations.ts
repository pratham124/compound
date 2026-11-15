import { Easing, FadeIn, FadeOut, Keyframe, LinearTransition, ReduceMotion } from 'react-native-reanimated';

import { motion, press } from '../theme/tokens.ts';

const easeOut = Easing.bezier(...press.easing);

/**
 * What sits below a notice, or beside something that changes height, slides rather than jumps.
 * The slide is movement, so it is skipped, not shortened, when Reduce Motion is on.
 */
export const slideLayout = LinearTransition.duration(motion.noticeMs).easing(easeOut).reduceMotion(ReduceMotion.System);

/** An error notice: fades in and out. */
export function noticeMotion() {
  return {
    entering: FadeIn.duration(motion.noticeMs).easing(easeOut).reduceMotion(ReduceMotion.Never),
    exiting: FadeOut.duration(motion.noticeMs).easing(easeOut).reduceMotion(ReduceMotion.Never),
    layout: slideLayout,
  };
}

/** A title changing with its step: a plain fade, kept under Reduce Motion. */
export const titleEntering = FadeIn.duration(motion.stepMs).easing(easeOut).reduceMotion(ReduceMotion.Never);

/** The next step of a flow: fades in, rising a few points unless Reduce Motion is on. */
export function stepEntering(reduceMotion: boolean) {
  if (reduceMotion) {
    return titleEntering;
  }

  return new Keyframe({
    0: { opacity: 0, transform: [{ translateY: motion.stepNudge }] },
    100: { opacity: 1, transform: [{ translateY: 0 }], easing: easeOut },
  }).duration(motion.stepMs);
}

// Fades are kept under Reduce Motion; Reanimated's default (System) would skip them entirely.
export const stepExiting = FadeOut.duration(motion.noticeMs).easing(easeOut).reduceMotion(ReduceMotion.Never);
