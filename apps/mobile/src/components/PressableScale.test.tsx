import * as Haptics from 'expo-haptics';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, Text } from 'react-native';

import { PressableScale } from './PressableScale.tsx';

afterEach(() => {
  jest.restoreAllMocks();
});

function pressable(props: Partial<React.ComponentProps<typeof PressableScale>> = {}) {
  return (
    <PressableScale accessibilityRole="button" {...props}>
      <Text>Go</Text>
    </PressableScale>
  );
}

describe('PressableScale haptic', () => {
  it('gives a light tap on a press, and still passes the press on', async () => {
    const impact = jest.spyOn(Haptics, 'impactAsync').mockResolvedValue();
    const onPress = jest.fn();

    await render(pressable({ onPress }));
    await fireEvent.press(screen.getByRole('button'));

    expect(impact).toHaveBeenCalledTimes(1);
    expect(impact).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('stays silent when the touch is taken away before it is a press, as when a scroll starts on the button', async () => {
    const impact = jest.spyOn(Haptics, 'impactAsync').mockResolvedValue();

    await render(pressable());
    await fireEvent(screen.getByRole('button'), 'pressIn');
    await fireEvent(screen.getByRole('button'), 'pressOut');

    expect(impact).not.toHaveBeenCalled();
  });

  it('gives the tap even with Reduce Motion on, because a haptic is not motion', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);

    const impact = jest.spyOn(Haptics, 'impactAsync').mockResolvedValue();

    await render(pressable());
    await act(async () => undefined);
    await fireEvent.press(screen.getByRole('button'));

    expect(impact).toHaveBeenCalledTimes(1);
  });

  it('gives no tap when turned off', async () => {
    const impact = jest.spyOn(Haptics, 'impactAsync').mockResolvedValue();

    await render(pressable({ haptic: 'none' }));
    await fireEvent.press(screen.getByRole('button'));

    expect(impact).not.toHaveBeenCalled();
  });
});

describe('PressableScale glyph press', () => {
  const glyphPress = { rotateDeg: 90, scale: 1.1 };

  it('turns and grows the glyph while pressed, and lets it go on release', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);

    await render(pressable({ glyphPress }));
    await act(async () => undefined);
    const button = screen.getByRole('button');

    await fireEvent(button, 'pressIn');
    expect(screen.getByTestId('press-glyph')).toHaveStyle({ transform: [{ rotate: '90deg' }, { scale: 1.1 }] });

    await fireEvent(button, 'pressOut');
    expect(screen.getByTestId('press-glyph')).toHaveStyle({ transform: [{ rotate: '0deg' }, { scale: 1 }] });
  });

  it('leaves the glyph still with Reduce Motion on', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);

    await render(pressable({ glyphPress }));
    await act(async () => undefined);
    await fireEvent(screen.getByRole('button'), 'pressIn');

    expect(screen.queryByTestId('press-glyph')).toBeNull();
  });
});
