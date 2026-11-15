import { chatButton } from '../theme/tokens.ts';

/** Keyframe positions, in percent of one blink cycle: eyes start to close, are shut, then open again at 100. */
export function blinkOffsets({ everyMs, durationMs }: { everyMs: number; durationMs: number }) {
  const closeFrom = 100 - (durationMs / everyMs) * 100;

  return { closeFrom, closed: closeFrom + (100 - closeFrom) / 2 };
}

const { closeFrom, closed } = blinkOffsets({
  everyMs: chatButton.blinkEveryMs,
  durationMs: chatButton.blinkDurationMs,
});

export const blinkAnimation = {
  animationName: {
    '0%': { transform: [{ scaleY: 1 }] },
    [`${closeFrom}%`]: { transform: [{ scaleY: 1 }] },
    [`${closed}%`]: { transform: [{ scaleY: 0.1 }] },
    '100%': { transform: [{ scaleY: 1 }] },
  },
  animationDuration: `${chatButton.blinkEveryMs}ms`,
  animationIterationCount: 'infinite',
  animationTimingFunction: 'ease-in-out',
} as const;
