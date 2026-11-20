import * as Haptics from 'expo-haptics';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { interpolateColor, useAnimatedProps, useAnimatedReaction, useAnimatedStyle, useDerivedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { PressableScale } from '../components/PressableScale.tsx';
import { layout, radius, space, type } from '../theme/tokens.ts';
import { useAppearance } from '../theme/useAppearance.ts';
import { ARM_COLOUR_MS, colourEase } from './loggerMotion.ts';

export const DELETE_WIDTH = 80;

const TRASH_PATH = 'M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3';
const AnimatedPath = Animated.createAnimatedComponent(Path);

/** Whether a row dragged to `position` is past the point where letting go deletes it. */
export function pastDeletePoint(position: number, rowWidth: number) {
  'worklet';

  return rowWidth > 0 && -position > rowWidth / 2;
}

type SwipeDeleteProps = {
  translation: SharedValue<number>;
  armed: SharedValue<boolean>;
  rowWidth: SharedValue<number>;
  onDelete: () => void;
};

export function SwipeDelete({ translation, armed, rowWidth, onDelete }: SwipeDeleteProps) {
  const { palette } = useAppearance();
  const { fontScale } = useWindowDimensions();
  const large = fontScale >= layout.largerTextFrom;

  useAnimatedReaction(
    () => pastDeletePoint(translation.get(), rowWidth.get()),
    (past, wasPast) => {
      armed.set(past);

      if (past && wasPast !== true) {
        scheduleOnRN(Haptics.impactAsync, Haptics.ImpactFeedbackStyle.Light);
      }
    },
  );

  const fill = useDerivedValue(() => withTiming(armed.get() ? 1 : 0, { duration: ARM_COLOUR_MS, easing: colourEase }));
  const pillStyle = useAnimatedStyle(() => ({ width: Math.max(DELETE_WIDTH, -translation.get()) - space.xs * 2 }));
  const fillStyle = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(fill.get(), [0, 1], [palette.dangerTint, palette.danger]) }));
  const labelStyle = useAnimatedStyle(() => ({ color: interpolateColor(fill.get(), [0, 1], [palette.danger, palette.card]) }));
  const iconProps = useAnimatedProps(() => ({ stroke: interpolateColor(fill.get(), [0, 1], [palette.danger, palette.card]) }));

  return (
    <View style={styles.slot}>
      <Animated.View style={[styles.pill, pillStyle]}>
        <PressableScale
          accessible={false}
          importantForAccessibility="no"
          haptic="none"
          onPress={onDelete}
          style={styles.button}
        >
          <Animated.View style={[styles.fill, fillStyle]}>
            <Svg width={18} height={18} viewBox="0 0 24 24" accessible={false}>
              <AnimatedPath
                d={TRASH_PATH}
                fill="none"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                animatedProps={iconProps}
              />
            </Svg>
            {large ? null : <Animated.Text style={[type.subheadline, styles.label, labelStyle]}>Delete</Animated.Text>}
          </Animated.View>
        </PressableScale>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  slot: { width: DELETE_WIDTH },
  pill: { position: 'absolute', top: 0, bottom: 0, right: space.xs, justifyContent: 'center' },
  button: { height: layout.fieldHeight },
  fill: {
    flex: 1,
    borderRadius: radius.field,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    overflow: 'hidden',
  },
  label: { fontWeight: '600' },
});
