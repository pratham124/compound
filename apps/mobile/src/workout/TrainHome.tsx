import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '../components/PressableScale.tsx';
import { Blob } from '../components/Blob.tsx';
import { layout, radius, space, type } from '../theme/tokens.ts';
import { useAppearance } from '../theme/useAppearance.ts';

const WEEK_DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const PLAY_ICON = 'M9 5.5L18.5 12 9 18.5Z';

type TrainHomeProps = {
  starting: boolean;
  disabled: boolean;
  onStart: () => void;
};

export function TrainHome({ starting, disabled, onStart }: TrainHomeProps) {
  return (
    <View style={styles.sections}>
      <NoRoutinesCard />
      <StartWorkoutGroup starting={starting} disabled={disabled} onStart={onStart} />
      <ThisWeekCard />
      <PersonalRecordsSection />
    </View>
  );
}

function NoRoutinesCard() {
  const { palette } = useAppearance();

  return (
    <View accessibilityLabel="Next day" style={[styles.card, { backgroundColor: palette.card }]}>
      <Text accessibilityRole="header" style={[type.title2, { color: palette.label }]}>No routines yet</Text>
      <Text style={[type.subheadline, { color: palette.secondary }]}>Create one to see what's next.</Text>
    </View>
  );
}

function StartWorkoutGroup({ starting, disabled, onStart }: TrainHomeProps) {
  const { palette } = useAppearance();
  const inactive = disabled || starting;

  return (
    <View style={[styles.group, { backgroundColor: palette.card }]}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel="Start workout"
        accessibilityState={{ busy: starting, disabled: inactive }}
        disabled={inactive}
        onPress={onStart}
        style={styles.row}
      >
        <Blob tint={palette.accentSoft} stroke={palette.accent} iconPath={PLAY_ICON} />
        <Text style={[type.body, styles.rowLabel, { color: inactive ? palette.secondary : palette.accent }]}>Start workout</Text>
        {starting ? <ActivityIndicator color={palette.accent} /> : null}
      </PressableScale>
    </View>
  );
}

function ThisWeekCard() {
  const { palette } = useAppearance();

  return (
    <View accessibilityLabel="Past workouts" style={[styles.card, { backgroundColor: palette.card }]}>
      <View style={styles.headingRow}>
        <Text accessibilityRole="header" style={[type.headline, { color: palette.label }]}>This week</Text>
      </View>
      <WeekStrip />
      <Text style={[type.subheadline, styles.empty, { color: palette.secondary }]}>No workouts this week.</Text>
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

function PersonalRecordsSection() {
  const { palette } = useAppearance();

  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={[type.subheadline, styles.groupHeading, { color: palette.secondary }]}>Personal records</Text>
      <View style={[styles.group, { backgroundColor: palette.card }]}>
        <Text style={[type.subheadline, styles.empty, { color: palette.secondary }]}>No records yet. Finish a workout to set one.</Text>
      </View>
    </View>
  );
}

// getDay() counts from Sunday; the strip starts on Monday.
function mondayFirstWeekday(date: Date) {
  return (date.getDay() + 6) % 7;
}

const styles = StyleSheet.create({
  sections: { gap: layout.cardGap },
  section: { gap: space.sm, paddingTop: space.sm },
  card: { borderRadius: radius.card, padding: layout.cardPadding, gap: space.xs },
  headingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: space.sm },
  group: { borderRadius: radius.card, padding: space.sm, gap: layout.groupGap },
  groupHeading: { paddingHorizontal: space.xs, fontWeight: '600' },
  row: { minHeight: layout.minTouch, paddingHorizontal: 10, paddingVertical: space.sm, borderRadius: radius.row, flexDirection: 'row', alignItems: 'center', gap: space.md },
  rowLabel: { flex: 1, fontWeight: '600' },
  empty: { padding: space.sm },
  week: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: space.md },
  day: { alignItems: 'center', gap: space.xs },
  dayLabel: { fontWeight: '600' },
  todayLabel: { fontWeight: '700' },
  todayRing: { borderWidth: 2.5 },
  dayRing: { width: 18, height: 18, borderRadius: radius.capsule, borderWidth: 1.5 },
});
