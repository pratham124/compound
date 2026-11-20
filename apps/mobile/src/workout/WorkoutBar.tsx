import { ActivityIndicator, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { Button } from '../components/Button.tsx';
import { PressableScale } from '../components/PressableScale.tsx';
import { layout, radius, space, type } from '../theme/tokens.ts';
import { useAppearance } from '../theme/useAppearance.ts';
import { progressGrow } from './loggerMotion.ts';
import { WorkoutClock } from './WorkoutClock.tsx';

const FINISH_HEIGHT = 36;
const FINISH_SLOP = { top: (layout.minTouch - FINISH_HEIGHT) / 2, bottom: (layout.minTouch - FINISH_HEIGHT) / 2 };
const CHECK_PATH = 'M5 12.5l4.5 4.5L19 7.5';

type WorkoutBarProps = {
  startedAt: number;
  done: number;
  total: number;
  error: boolean;
  finishing: boolean;
  onFinish: () => void;
  onRetry: () => void;
};

export function WorkoutBar({ startedAt, done, total, error, finishing, onFinish, onRetry }: WorkoutBarProps) {
  const { palette } = useAppearance();
  const { fontScale } = useWindowDimensions();
  const large = fontScale >= layout.largerTextFrom;
  const fillWidth = `${total === 0 ? 0 : (done / total) * 100}%` as const;

  return (
    <View style={[styles.bar, { backgroundColor: palette.bg }]}>
      <View style={[styles.top, large ? styles.topLarge : null]}>
        <WorkoutClock startedAt={startedAt} />
        <Text accessibilityRole="header" style={[type.headline, styles.title, { color: palette.label }]}>Workout</Text>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="Finish"
          accessibilityState={{ busy: finishing, disabled: finishing }}
          disabled={finishing}
          hitSlop={FINISH_SLOP}
          onPress={onFinish}
          style={[styles.finish, { backgroundColor: palette.accentSoft }]}
        >
          {finishing ? <ActivityIndicator color={palette.accent} /> : (
            <>
              <Svg width={14} height={14} viewBox="0 0 24 24" accessible={false}>
                <Path
                  d={CHECK_PATH}
                  fill="none"
                  stroke={palette.accent}
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
              <Text style={[type.subheadline, styles.strong, { color: palette.accent }]}>Finish</Text>
            </>
          )}
        </PressableScale>
      </View>
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={`${done} of ${total} sets done`}
        accessibilityValue={{ min: 0, max: total, now: done }}
        style={styles.progress}
      >
        <View style={[styles.track, { backgroundColor: palette.accentSoft }]}>
          <Animated.View style={[styles.fill, progressGrow, { backgroundColor: palette.accent, width: fillWidth }]} />
        </View>
        <Text style={[type.footnote, styles.count, { color: palette.secondary }]}>{done} of {total} sets</Text>
      </View>
      {error ? <Button palette={palette} label="Save failed. Retry" variant="quiet" onPress={onRetry} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { paddingHorizontal: layout.screenMargin, paddingTop: space.xs, paddingBottom: space.lg, gap: space.xs },
  top: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: space.sm },
  topLarge: { flexDirection: 'column', alignItems: 'stretch' },
  title: { flexGrow: 1, flexShrink: 1, textAlign: 'center' },
  finish: {
    minHeight: FINISH_HEIGHT,
    minWidth: layout.minTouch,
    paddingHorizontal: space.md,
    paddingVertical: 6,
    borderRadius: radius.capsule,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
  },
  strong: { fontWeight: '600' },
  progress: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.xs },
  track: { flex: 1, height: 6, borderRadius: radius.capsule, overflow: 'hidden' },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: radius.capsule },
  count: { fontVariant: ['tabular-nums'] },
});
