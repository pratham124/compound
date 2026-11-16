import * as Haptics from 'expo-haptics';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { currentStyle } from '../testing/animatedStyle.ts';
import { colors, motion } from '../theme/tokens.ts';
import { HOLD_FILL_TEST_ID } from './HoldToConfirmRow.tsx';
import { SignOutGroup } from './SignOutGroup.tsx';

function group(options: { signingOut?: boolean; signOutFailed?: boolean; onSignOut?: jest.Mock } = {}) {
  return (
    <SignOutGroup
      palette={colors.light}
      onSignOut={options.onSignOut ?? jest.fn()}
      signingOut={options.signingOut ?? false}
      signOutFailed={options.signOutFailed ?? false}
    />
  );
}

const ONE_FRAME_MS = 16;

function deleteRow() {
  return screen.getByRole('button', { name: 'Delete account' });
}

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('SignOutGroup sign out row', () => {
  it('signs out when the row is pressed', async () => {
    const onSignOut = jest.fn();

    await render(group({ onSignOut }));
    await fireEvent.press(screen.getByRole('button', { name: 'Sign out' }));

    expect(onSignOut).toHaveBeenCalledTimes(1);
  });

  it('reads Signing out… and ignores presses while signing out', async () => {
    const onSignOut = jest.fn();

    await render(group({ signingOut: true, onSignOut }));
    await fireEvent.press(screen.getByRole('button', { name: 'Signing out…' }));

    expect(screen.getByText('Signing out…')).toBeOnTheScreen();
    expect(screen.queryByText('Sign out')).not.toBeOnTheScreen();
    expect(onSignOut).not.toHaveBeenCalled();
  });

  it('says so under the row when signing out failed', async () => {
    await render(group({ signOutFailed: true }));

    expect(screen.getByRole('alert')).toHaveTextContent(/Couldn't sign out/);
  });

  it('shows no notice when nothing failed', async () => {
    await render(group());

    expect(screen.queryByRole('alert')).not.toBeOnTheScreen();
  });
});

describe('SignOutGroup delete account row', () => {
  it('does not confirm when let go just before the hold is complete, and says to hold', async () => {
    jest.useFakeTimers();

    const haptic = jest.spyOn(Haptics, 'notificationAsync').mockResolvedValue();

    await render(group());
    await fireEvent(deleteRow(), 'pressIn');
    await act(() => jest.advanceTimersByTime(motion.holdToDeleteMs - 100));
    await fireEvent(deleteRow(), 'pressOut');
    await fireEvent(deleteRow(), 'press');
    await act(() => jest.advanceTimersByTime(motion.holdToDeleteMs));

    expect(haptic).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Hold to delete your account.');
  });

  it('confirms once the full hold has passed, with a warning haptic and the not-available notice', async () => {
    jest.useFakeTimers();

    const haptic = jest.spyOn(Haptics, 'notificationAsync').mockResolvedValue();

    await render(group());
    await fireEvent(deleteRow(), 'pressIn');
    await act(() => jest.advanceTimersByTime(motion.holdToDeleteMs + ONE_FRAME_MS));

    expect(haptic).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Warning);
    expect(screen.getByRole('alert')).toHaveTextContent("Deleting your account isn't available yet.");
  });

  it('confirms only once however long the hold goes on, and letting go afterwards adds nothing', async () => {
    jest.useFakeTimers();

    const haptic = jest.spyOn(Haptics, 'notificationAsync').mockResolvedValue();

    await render(group());
    await fireEvent(deleteRow(), 'pressIn');
    await act(() => jest.advanceTimersByTime(motion.holdToDeleteMs * 3));
    await fireEvent(deleteRow(), 'pressOut');
    await fireEvent(deleteRow(), 'press');
    await act(() => jest.advanceTimersByTime(motion.holdToDeleteMs));

    expect(haptic).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('alert')).toHaveTextContent("Deleting your account isn't available yet.");
  });

  it('does not say to hold when a scroll takes the touch away', async () => {
    await render(group());
    await fireEvent(deleteRow(), 'pressIn');
    await fireEvent(deleteRow(), 'pressOut');

    expect(screen.queryByRole('alert')).not.toBeOnTheScreen();
  });

  it('does not confirm on the screen reader activate action, which is a tap and not a hold', async () => {
    const haptic = jest.spyOn(Haptics, 'notificationAsync').mockResolvedValue();

    await render(group());
    await fireEvent(deleteRow(), 'accessibilityAction', { nativeEvent: { actionName: 'activate' } });

    expect(haptic).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).not.toBeOnTheScreen();
    expect(deleteRow().props.accessibilityHint).toBe('Double-tap and hold to delete your account');
  });

  it('keeps the fill hidden until the row has been measured, then shows it', async () => {
    jest.useFakeTimers();

    await render(group());

    expect(currentStyle(screen.getByTestId(HOLD_FILL_TEST_ID)).opacity).toBe(0);

    await fireEvent(screen.getByTestId(HOLD_FILL_TEST_ID), 'layout', { nativeEvent: { layout: { width: 300, height: 44, x: 0, y: 0 } } });
    await act(() => jest.advanceTimersByTime(ONE_FRAME_MS));

    expect(currentStyle(screen.getByTestId(HOLD_FILL_TEST_ID)).opacity).toBe(1);
  });

  it('sweeps the fill across while held and snaps it back when let go early', async () => {
    jest.useFakeTimers();

    const ROW_WIDTH = 300;

    await render(group());
    await fireEvent(screen.getByTestId(HOLD_FILL_TEST_ID), 'layout', { nativeEvent: { layout: { width: ROW_WIDTH, height: 44, x: 0, y: 0 } } });
    await act(() => jest.advanceTimersByTime(ONE_FRAME_MS));

    expect(currentStyle(screen.getByTestId(HOLD_FILL_TEST_ID)).transform[0].translateX).toBe(-ROW_WIDTH);

    await fireEvent(deleteRow(), 'pressIn');
    await act(() => jest.advanceTimersByTime(motion.holdToDeleteMs / 2));

    expect(currentStyle(screen.getByTestId(HOLD_FILL_TEST_ID)).transform[0].translateX).toBeCloseTo(-ROW_WIDTH / 2, -2);

    await act(() => jest.advanceTimersByTime(motion.holdToDeleteMs / 2 - 200));
    await fireEvent(deleteRow(), 'pressOut');
    await act(() => jest.advanceTimersByTime(motion.holdReleaseMs + 100));

    expect(currentStyle(screen.getByTestId(HOLD_FILL_TEST_ID)).transform[0].translateX).toBe(-ROW_WIDTH);
  });

  it('fades the fill in over the hold instead of sweeping under Reduce Motion', async () => {
    jest.useFakeTimers();
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);

    await render(group());
    await act(async () => undefined);
    await act(() => jest.advanceTimersByTime(ONE_FRAME_MS));
    await fireEvent(deleteRow(), 'pressIn');
    await act(() => jest.advanceTimersByTime(motion.holdToDeleteMs / 2));

    const style = currentStyle(screen.getByTestId(HOLD_FILL_TEST_ID));

    expect(style.opacity).toBeGreaterThan(0.3);
    expect(style.opacity).toBeLessThan(0.7);
  });

  it('deletes nothing and signs nobody out, even when the hold completes', async () => {
    jest.useFakeTimers();

    const onSignOut = jest.fn();
    const requests = jest.spyOn(globalThis, 'fetch');

    jest.spyOn(Haptics, 'notificationAsync').mockResolvedValue();

    await render(group({ onSignOut }));
    await fireEvent(deleteRow(), 'pressIn');
    await act(() => jest.advanceTimersByTime(motion.holdToDeleteMs + ONE_FRAME_MS));

    expect(onSignOut).not.toHaveBeenCalled();
    expect(requests).not.toHaveBeenCalled();
  });

  it('cannot be held while signing out', async () => {
    jest.useFakeTimers();

    const haptic = jest.spyOn(Haptics, 'notificationAsync').mockResolvedValue();

    await render(group({ signingOut: true }));
    await fireEvent(deleteRow(), 'pressIn');
    await act(() => jest.advanceTimersByTime(motion.holdToDeleteMs + ONE_FRAME_MS));

    expect(haptic).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).not.toBeOnTheScreen();
  });
});
