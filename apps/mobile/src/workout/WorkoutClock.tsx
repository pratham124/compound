import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { type } from '../theme/tokens.ts';
import { useAppearance } from '../theme/useAppearance.ts';

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
    <View accessible accessibilityLabel={`Elapsed workout time, ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`} style={styles.time}>
      <Text style={[type.caption, { color: palette.secondary }]}>Time</Text>
      <Text testID="workout-clock" accessible={false} importantForAccessibility="no" style={[type.body, { color: palette.label, fontVariant: ['tabular-nums'] }]}>{clock}</Text>
    </View>
  );
}

const styles = StyleSheet.create({ time: { minWidth: 50, flexShrink: 1, maxWidth: '100%' } });
