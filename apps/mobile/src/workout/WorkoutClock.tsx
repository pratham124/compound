import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { radius, space, type } from '../theme/tokens.ts';
import { useAppearance } from '../theme/useAppearance.ts';

const PILL_HEIGHT = 36;

export function WorkoutClock({ startedAt }: { startedAt: number }) {
  const { palette } = useAppearance();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);

    return () => clearInterval(timer);
  }, []);

  const elapsed = Math.max(0, Math.floor((now - startedAt) / 1000));
  const minutes = Math.floor(elapsed / 60);
  const seconds = String(elapsed % 60).padStart(2, '0');
  const clock = elapsed >= 3600 ? `${Math.floor(elapsed / 3600)}:${String(minutes % 60).padStart(2, '0')}:${seconds}` : `${minutes}:${seconds}`;

  return (
    <View accessible accessibilityLabel={`Elapsed workout time, ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`} style={[styles.pill, { backgroundColor: palette.card }]}>
      <Svg width={15} height={15} viewBox="0 0 24 24" accessible={false}>
        <Circle cx={12} cy={13.5} r={7.5} fill="none" stroke={palette.accent} strokeWidth={2.2} />
        <Path d="M10 2.75h4M12 2.75v3.25M18.6 6.4l-1.3 1.3M12 13.5V9.75" fill="none" stroke={palette.accent} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
      <Text testID="workout-clock" accessible={false} importantForAccessibility="no" style={[type.subheadline, styles.time, { color: palette.label }]}>{clock}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { minHeight: PILL_HEIGHT, paddingHorizontal: space.md, borderRadius: radius.capsule, flexDirection: 'row', alignItems: 'center', gap: space.xs },
  time: { fontWeight: '600', fontVariant: ['tabular-nums'] },
});
