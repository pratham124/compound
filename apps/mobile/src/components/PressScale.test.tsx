import * as Haptics from 'expo-haptics';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { PressScale } from './PressScale.tsx';

afterEach(() => {
  jest.restoreAllMocks();
});

function pressable(props: Partial<React.ComponentProps<typeof PressScale>> = {}) {
  return (
    <PressScale accessibilityRole="button" style={{}} {...props}>
      <Text>Go</Text>
    </PressScale>
  );
}

describe('PressScale haptic', () => {
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

  it('gives no tap when turned off', async () => {
    const impact = jest.spyOn(Haptics, 'impactAsync').mockResolvedValue();

    await render(pressable({ haptic: 'none' }));
    await fireEvent.press(screen.getByRole('button'));

    expect(impact).not.toHaveBeenCalled();
  });
});
