import { StyleSheet, Text, View } from 'react-native';

import { radius, space, type } from '../../theme/tokens.ts';
import { useAppearance } from '../../theme/useAppearance.ts';
import { sectionStyles } from './sectionStyles.ts';

const WEEK_DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function PastWorkoutsSection() {
  const { palette } = useAppearance();

  return (
    <View accessibilityLabel="Past workouts" style={[sectionStyles.card, { backgroundColor: palette.card }]}>
      <Text accessibilityRole="header" style={[type.headline, { color: palette.label }]}>This week</Text>
      <WeekStrip />
      <Text style={[type.subheadline, sectionStyles.empty, { color: palette.secondary }]}>Finished workouts aren't shown here yet.</Text>
    </View>
  );
}

function WeekStrip() {
  const today = mondayFirstWeekday(new Date());

  return (
    <View accessible={false} importantForAccessibility="no-hide-descendants" style={styles.week}>
      {WEEK_DAYS.map((letter, index) => <WeekDay key={index} letter={letter} isToday={index === today} />)}
    </View>
  );
}

function WeekDay({ letter, isToday }: { letter: string; isToday: boolean }) {
  const { palette } = useAppearance();
  const colour = isToday ? palette.accent : palette.secondary;

  return (
    <View style={styles.day}>
      <Text style={[type.caption, isToday ? styles.todayLabel : styles.dayLabel, { color: colour }]}>{letter}</Text>
      <View style={[styles.dayRing, isToday ? styles.todayRing : null, { borderColor: isToday ? palette.accent : palette.separatorStrong }]} />
    </View>
  );
}

// getDay() counts from Sunday; the strip starts on Monday.
function mondayFirstWeekday(date: Date) {
  return (date.getDay() + 6) % 7;
}

const styles = StyleSheet.create({
  week: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: space.md },
  day: { alignItems: 'center', gap: space.xs },
  dayLabel: { fontWeight: '600' },
  todayLabel: { fontWeight: '700' },
  todayRing: { borderWidth: 2.5 },
  dayRing: { width: 18, height: 18, borderRadius: radius.capsule, borderWidth: 1.5 },
});
