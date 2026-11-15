import { useRouter } from 'expo-router';
import { StyleSheet } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { layout, press, radius } from '../theme/tokens.ts';
import { useAppearance } from '../theme/useAppearance.ts';
import { PressableScale } from './PressableScale.tsx';

export function ProfileButton() {
  const { palette } = useAppearance();
  const router = useRouter();

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel="Settings"
      pressedScale={press.iconScale}
      onPress={() => router.push('/settings')}
      style={[styles.circle, { backgroundColor: palette.accentSoft }]}
    >
      <Svg width={22} height={22} viewBox="0 0 22 22">
        <Circle cx={11} cy={7.5} r={3.6} fill={palette.accent} />
        <Path d="M3.5 19 C3.5 14.6 6.8 12.6 11 12.6 C15.2 12.6 18.5 14.6 18.5 19 Z" fill={palette.accent} />
      </Svg>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  circle: {
    width: layout.minTouch,
    height: layout.minTouch,
    borderRadius: radius.capsule,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
