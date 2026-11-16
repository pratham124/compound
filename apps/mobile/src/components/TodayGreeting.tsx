import { StyleSheet, Text, View } from 'react-native';

import { dateLineFor, greetingFor } from '../today/greeting.ts';
import { useNow } from '../today/useNow.ts';
import { space, type } from '../theme/tokens.ts';
import { useAppearance } from '../theme/useAppearance.ts';

/** `now` pins the time for tests and fixtures; on screen the greeting keeps its own clock. */
export type TodayGreetingProps = { name: string; now?: Date };

/** The two lines under "Today": a greeting by the time of day, and the date (`.hello` and the line below it in the mockup). */
export function TodayGreeting({ name, now: pinned }: TodayGreetingProps) {
  const { palette } = useAppearance();
  const live = useNow();
  const now = pinned ?? live;

  return (
    <View style={styles.lines}>
      <Text style={[type.callout, { color: palette.label }]}>{greetingFor({ now, name })}</Text>
      <Text style={[type.subheadline, { color: palette.secondary }]}>{dateLineFor(now)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  lines: { marginTop: space.xxs },
});
