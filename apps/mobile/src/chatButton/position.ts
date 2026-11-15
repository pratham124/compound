import { z } from 'zod';

import { chatButton, layout } from '../theme/tokens.ts';

export const positionSchema = z.object({
  edge: z.enum(['left', 'right']),
  /** Height of the button's centre as a share of the screen height, so it survives other screen sizes. */
  fraction: z.number().min(0).max(1),
});

export type ButtonPosition = z.infer<typeof positionSchema>;

export type ScreenBox = {
  width: number;
  height: number;
  insetTop: number;
  insetBottom: number;
};

type Point = { x: number; y: number };

/** Fraction 1 is clamped up to the lowest allowed spot, which is just above the tab bar on any screen. */
export const defaultPosition: ButtonPosition = { edge: chatButton.defaultEdge, fraction: 1 };

function clamp(value: number, min: number, max: number): number {
  'worklet';

  return Math.min(Math.max(value, min), max);
}

function clampCenterY(centerY: number, screen: ScreenBox): number {
  'worklet';

  const half = chatButton.touch / 2;
  const min = screen.insetTop + chatButton.edgeGap + half;

  const max =
    screen.height -
    Math.max(screen.insetBottom, layout.tabBarBottom) -
    layout.tabBarHeight -
    chatButton.edgeGap -
    half;

  return clamp(centerY, min, max);
}

/** Where a released button settles: the nearer side edge, at the height it was let go. */
export function positionFromRelease(
  release: { centerX: number; centerY: number },
  screen: ScreenBox,
): ButtonPosition {
  'worklet';

  const edge = release.centerX < screen.width / 2 ? 'left' : 'right';

  return { edge, fraction: clampCenterY(release.centerY, screen) / screen.height };
}

/** Top-left corner of the button's touch box for a stored position on this screen. */
export function restingPoint(position: ButtonPosition, screen: ScreenBox): Point {
  'worklet';

  const x =
    position.edge === 'left' ? chatButton.edgeGap : screen.width - chatButton.edgeGap - chatButton.touch;

  const centerY = clampCenterY(position.fraction * screen.height, screen);

  return { x, y: centerY - chatButton.touch / 2 };
}
