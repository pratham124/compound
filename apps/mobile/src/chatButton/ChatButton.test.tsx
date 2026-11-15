import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { createGestureController } from 'react-native-gesture-handler/jest-utils';

import { ChatButton, type ChatButtonAppear, type ChatButtonVisibility, PAN_TEST_ID, TAP_TEST_ID } from './ChatButton.tsx';
import { chatButton, motion, press } from '../theme/tokens.ts';
import { currentStyle } from '../testing/animatedStyle.ts';
import type { ButtonPosition } from './position.ts';

const phone = { width: 390, height: 844, insetTop: 47, insetBottom: 34 };

type ButtonOptions = {
  onMoved?: (p: ButtonPosition) => void;
  onPress?: () => void;
  reduceMotion?: boolean;
  appear?: ChatButtonAppear;
  visibility?: ChatButtonVisibility;
};

function buttonTree(options: ButtonOptions = {}) {
  return (
    <GestureHandlerRootView>
      <ChatButton
        initialPosition={{ edge: 'right', fraction: 0.5 }}
        screen={phone}
        reduceMotion={options.reduceMotion ?? false}
        visibility={options.visibility ?? 'shown'}
        appear={options.appear ?? 'instant'}
        onShown={() => {}}
        onPress={options.onPress ?? (() => {})}
        onMoved={options.onMoved ?? (() => {})}
      />
    </GestureHandlerRootView>
  );
}

async function renderButton(options: ButtonOptions = {}) {
  await render(buttonTree(options));
}

function button() {
  return screen.getByRole('button', { name: 'Ask Compound' });
}

describe('ChatButton drag', () => {
  it('snaps to the left edge, keeping its height, when dragged past the middle and released', async () => {
    const moved: ButtonPosition[] = [];

    await renderButton({ onMoved: (position) => moved.push(position) });

    const pan = createGestureController(PAN_TEST_ID);

    pan.begin();
    pan.activate({ translationX: 0, translationY: 0 });
    pan.update({ translationX: -300, translationY: 100 });
    pan.end({ translationX: -300, translationY: 100, velocityX: -800, velocityY: 0 });

    await waitFor(() => expect(moved).toHaveLength(1));
    expect(moved[0]?.edge).toBe('left');
    expect(moved[0]?.fraction).toBeCloseTo((422 + 100) / 844);
  });

  it('stays on the right edge when released before the middle', async () => {
    const moved: ButtonPosition[] = [];

    await renderButton({ onMoved: (position) => moved.push(position) });

    const pan = createGestureController(PAN_TEST_ID);

    pan.begin();
    pan.activate({ translationX: 0, translationY: 0 });
    pan.update({ translationX: -100, translationY: 0 });
    pan.end({ translationX: -100, translationY: 0, velocityX: 0, velocityY: 0 });

    await waitFor(() => expect(moved[0]?.edge).toBe('right'));
  });
});

describe('ChatButton tap', () => {
  it('opens chat on a tap and does not count it as a move', async () => {
    const moved: ButtonPosition[] = [];
    let presses = 0;

    await renderButton({ onMoved: (position) => moved.push(position), onPress: () => (presses += 1) });

    const tap = createGestureController(TAP_TEST_ID);

    tap.begin();
    tap.activate();
    tap.end();

    await waitFor(() => expect(presses).toBe(1));
    expect(moved).toHaveLength(0);
  });
});

describe('ChatButton accessibility', () => {
  it('is a button that VoiceOver reads as "Ask Compound"', async () => {
    await renderButton();

    expect(screen.getByRole('button', { name: 'Ask Compound' })).toBeTruthy();
  });
});

describe('ChatButton caught mid-spring', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  function currentX() {
    return currentStyle(button()).transform[0].translateX;
  }

  it('stays under the finger instead of jumping back to where it was at touch-down', async () => {
    jest.useFakeTimers();
    await renderButton();

    const pan = createGestureController(PAN_TEST_ID);

    pan.begin();
    pan.activate({ translationX: 0, translationY: 0 });
    pan.update({ translationX: -250, translationY: 0 });
    pan.end({ translationX: -250, translationY: 0, velocityX: 0, velocityY: 0 });

    await act(() => jest.advanceTimersByTime(60));
    pan.begin();
    await act(() => jest.advanceTimersByTime(100));

    const beforeCatch = currentX();

    pan.activate({ translationX: 10, translationY: 0 });
    pan.update({ translationX: 10, translationY: 0 });
    await act(() => jest.advanceTimersByTime(16));

    expect(currentX()).toBeCloseTo(beforeCatch, 0);
  });
});

describe('ChatButton for VoiceOver', () => {
  it('opens chat when VoiceOver double-taps it', async () => {
    let presses = 0;

    await renderButton({ onPress: () => (presses += 1) });
    await fireEvent(button(), 'accessibilityTap');

    expect(presses).toBe(1);
  });
});

describe('ChatButton first appearance', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('waits for the splash to fade, then fades in while growing from 90% to full size', async () => {
    jest.useFakeTimers();
    await renderButton({ appear: 'entrance' });

    await act(() => jest.advanceTimersByTime(motion.splashFadeMs - 20));

    expect(currentStyle(button()).opacity).toBe(0);
    expect(currentStyle(button()).transform[2].scale).toBeCloseTo(0.9);

    await act(() => jest.advanceTimersByTime(1000));

    expect(currentStyle(button()).opacity).toBe(1);
    expect(currentStyle(button()).transform[2].scale).toBeCloseTo(1);
  });

  it('only fades, with no growing, under Reduce Motion', async () => {
    jest.useFakeTimers();
    await renderButton({ appear: 'entrance', reduceMotion: true });

    expect(currentStyle(button()).opacity).toBe(0);
    expect(currentStyle(button()).transform[2].scale).toBe(1);

    await act(() => jest.advanceTimersByTime(1000));

    expect(currentStyle(button()).opacity).toBe(1);
  });

  it('keeps growing after the overlay marks the entrance as spent, instead of snapping to full size', async () => {
    jest.useFakeTimers();
    await renderButton({ appear: 'entrance' });
    await screen.rerender(buttonTree({ appear: 'instant' }));

    await act(() => jest.advanceTimersByTime(motion.splashFadeMs + chatButton.entrance.durationMs / 4));

    const { scale } = currentStyle(button()).transform[2];

    expect(scale).toBeGreaterThan(chatButton.entrance.fromScale);
    expect(scale).toBeLessThan(1);
  });

  it('is already fully there when it is not the first appearance', async () => {
    await renderButton({ appear: 'instant' });

    expect(currentStyle(button()).opacity).toBe(1);
  });
});

describe('ChatButton under Reduce Motion', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('jumps straight to its resting edge on release, with no spring', async () => {
    jest.useFakeTimers();
    await renderButton({ reduceMotion: true });

    const pan = createGestureController(PAN_TEST_ID);

    await act(() => {
      pan.begin();
      pan.activate({ translationX: 0, translationY: 0 });
      pan.update({ translationX: -300, translationY: 0 });
      pan.end({ translationX: -300, translationY: 0, velocityX: -800, velocityY: 0 });
    });

    await act(() => jest.advanceTimersByTime(16));

    expect(currentStyle(button()).transform[0].translateX).toBe(chatButton.edgeGap);
  });

  it('dims to the Reduce Motion press opacity instead of shrinking under the finger', async () => {
    jest.useFakeTimers();
    await renderButton({ reduceMotion: true });

    const pan = createGestureController(PAN_TEST_ID);

    await act(() => {
      pan.begin();
      jest.advanceTimersByTime(press.durationMs * 2);
    });

    expect(currentStyle(button()).transform[2].scale).toBe(1);
    expect(currentStyle(button()).opacity).toBeCloseTo(press.reducedMotionOpacity);
  });
});

describe('ChatButton faded out for the keyboard', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('ignores taps while invisible', async () => {
    jest.useFakeTimers();

    let presses = 0;

    await renderButton({ visibility: 'faded-out', onPress: () => (presses += 1) });

    const tap = createGestureController(TAP_TEST_ID);

    await act(() => {
      tap.begin();
      tap.activate();
      tap.end();
    });

    await act(() => jest.advanceTimersByTime(100));

    expect(presses).toBe(0);
  });
});

describe('ChatButton coming back from the quick chat sheet', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('pops back, growing from 90% while fading in, then settles at full size', async () => {
    jest.useFakeTimers();
    await renderButton({ visibility: 'under-sheet' });
    await screen.rerender(buttonTree({ visibility: 'shown' }));

    await act(() => jest.advanceTimersByTime(chatButton.popBack.durationMs / 4));

    const partway = currentStyle(button());

    expect(partway.transform[2].scale).toBeGreaterThan(0.9);
    expect(partway.transform[2].scale).toBeLessThan(1);
    expect(partway.opacity).toBeGreaterThan(0);
    expect(partway.opacity).toBeLessThan(1);

    await act(() => jest.advanceTimersByTime(chatButton.popBack.durationMs));

    expect(currentStyle(button()).transform[2].scale).toBeCloseTo(1);
    expect(currentStyle(button()).opacity).toBe(1);
  });

  it('only fades back, with no growing, under Reduce Motion', async () => {
    jest.useFakeTimers();
    await renderButton({ visibility: 'under-sheet', reduceMotion: true });
    await screen.rerender(buttonTree({ visibility: 'shown', reduceMotion: true }));

    await act(() => jest.advanceTimersByTime(chatButton.popBack.durationMs / 4));

    expect(currentStyle(button()).transform[2].scale).toBe(1);
  });

  it('does not pop when coming back from the keyboard, only fades', async () => {
    jest.useFakeTimers();
    await renderButton({ visibility: 'faded-out' });
    await screen.rerender(buttonTree({ visibility: 'shown' }));

    await act(() => jest.advanceTimersByTime(chatButton.fade.durationMs / 4));

    expect(currentStyle(button()).transform[2].scale).toBe(1);
  });
});
