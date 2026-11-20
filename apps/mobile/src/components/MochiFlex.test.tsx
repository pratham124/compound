import * as Haptics from 'expo-haptics';
import { act, render } from '@testing-library/react-native';

import { colors, motion } from '../theme/tokens.ts';
import { MochiFlex } from './MochiFlex.tsx';

const peakAt = motion.mochiFlexDelayMs + motion.mochiFlexMs;

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('MochiFlex haptic', () => {
  it('waits from when play turns true, not from mount, then buzzes success once and not again while it pumps', async () => {
    const notify = jest.spyOn(Haptics, 'notificationAsync').mockResolvedValue();

    const view = await render(<MochiFlex palette={colors.light} play={false} />);
    await act(() => jest.advanceTimersByTime(peakAt * 3));
    await view.rerender(<MochiFlex palette={colors.light} play />);
    await act(() => jest.advanceTimersByTime(peakAt - 1));
    expect(notify).not.toHaveBeenCalled();

    await act(() => jest.advanceTimersByTime(1));
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Success);

    await act(() => jest.advanceTimersByTime(motion.mochiPumpLoopMs * 5));
    expect(notify).toHaveBeenCalledTimes(1);
  });

  it('does not buzz after unmount', async () => {
    const notify = jest.spyOn(Haptics, 'notificationAsync').mockResolvedValue();

    const view = await render(<MochiFlex palette={colors.light} play />);
    await act(() => jest.advanceTimersByTime(peakAt - 1));
    await view.unmount();
    await act(() => jest.advanceTimersByTime(peakAt * 3));

    expect(notify).not.toHaveBeenCalled();
  });
});
