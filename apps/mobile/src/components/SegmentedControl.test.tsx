import { act, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, StyleSheet } from 'react-native';

import { currentStyle } from '../testing/animatedStyle.ts';
import { colors, motion } from '../theme/tokens.ts';
import { SegmentedControl, THUMB_TEST_ID, THUMB_WIDTH } from './SegmentedControl.tsx';

const options = [
  { value: 'metric', label: 'kg' },
  { value: 'imperial', label: 'lb' },
] as const;

function control(selected: 'metric' | 'imperial', disabled = false) {
  return (
    <SegmentedControl palette={colors.light} label="Units" options={options} selected={selected} disabled={disabled} onChoose={jest.fn()} />
  );
}

function thumbX() {
  return currentStyle(screen.getByTestId(THUMB_TEST_ID)).transform[0].translateX;
}

beforeEach(() => {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
});

afterEach(() => {
  jest.useRealTimers();
});

describe('SegmentedControl thumb', () => {
  it('starts under kg for metric and under lb for imperial, without sliding there', async () => {
    jest.useFakeTimers();

    const { unmount } = await render(control('metric'));

    expect(thumbX()).toBe(0);
    await unmount();
    await render(control('imperial'));

    expect(thumbX()).toBe(THUMB_WIDTH);
  });

  it('slides to the newly chosen side over the slide duration, not instantly', async () => {
    jest.useFakeTimers();

    const { rerender } = await render(control('metric'));

    await rerender(control('imperial'));
    await act(() => jest.advanceTimersByTime(motion.segmentSlideMs / 2));

    expect(thumbX()).toBeGreaterThan(0);
    expect(thumbX()).toBeLessThan(THUMB_WIDTH);

    await act(() => jest.advanceTimersByTime(motion.segmentSlideMs));

    expect(thumbX()).toBe(THUMB_WIDTH);
  });

  it('turns around from where it is when the choice flips back mid-slide', async () => {
    jest.useFakeTimers();

    const { rerender } = await render(control('metric'));

    await rerender(control('imperial'));
    await act(() => jest.advanceTimersByTime(motion.segmentSlideMs / 2));

    const midway = thumbX();

    await rerender(control('metric'));

    expect(thumbX()).toBeCloseTo(midway, 0);

    await act(() => jest.advanceTimersByTime(motion.segmentSlideMs * 2));

    expect(thumbX()).toBe(0);
  });

  it('jumps straight to the new side under Reduce Motion', async () => {
    jest.useFakeTimers();
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);

    const { rerender } = await render(control('metric'));

    await act(async () => undefined);
    await rerender(control('imperial'));
    // One frame, far short of the slide duration.
    await act(() => jest.advanceTimersByTime(16));

    expect(thumbX()).toBe(THUMB_WIDTH);
  });
});

describe('SegmentedControl touch targets', () => {
  it('gives each choice an equal half of the track to tap, under the thumb', async () => {
    await render(control('metric'));

    for (const radio of screen.getAllByRole('radio')) {
      expect(StyleSheet.flatten(radio.props.style)).toMatchObject({ flex: 1 });
    }
  });
});
