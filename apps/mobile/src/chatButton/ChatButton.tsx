import * as Haptics from 'expo-haptics';
import { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { GestureDetector, useCompetingGestures, usePanGesture, useTapGesture } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { chatButton, motion, press, shadow } from '../theme/tokens.ts';
import { useAppearance } from '../theme/useAppearance.ts';
import { Mochi } from './Mochi.tsx';
import { positionFromRelease, restingPoint, type ButtonPosition, type ScreenBox } from './position.ts';

/** How the button arrives when it mounts: the first time after launch, or at once. */
export type ChatButtonAppear = 'entrance' | 'instant';

/** `faded-out` is for the keyboard; `under-sheet` also fades it, and it pops back when the sheet closes. */
export type ChatButtonVisibility = 'shown' | 'faded-out' | 'under-sheet';

export type ChatButtonProps = {
  /** Read on mount and when the screen size changes. After a drag the button keeps its own position. */
  initialPosition: ButtonPosition;
  screen: ScreenBox;
  reduceMotion: boolean;
  visibility: ChatButtonVisibility;
  /** Read on mount only; the overlay changes it once the entrance is spent, which must not replay anything. */
  appear: ChatButtonAppear;
  onShown: () => void;
  onPress: () => void;
  onMoved: (position: ButtonPosition) => void;
};

export const PAN_TEST_ID = 'chat-button-pan';
export const TAP_TEST_ID = 'chat-button-tap';

const PRESS_EASING = Easing.bezier(...press.easing);
const FADE_EASING = Easing.bezier(...chatButton.fade.easing);
const ENTRANCE_EASING = Easing.bezier(...chatButton.entrance.easing);

export function ChatButton({
  initialPosition,
  screen,
  reduceMotion,
  visibility,
  appear,
  onShown,
  onPress,
  onMoved,
}: ChatButtonProps) {
  const { palette } = useAppearance();
  const faded = visibility !== 'shown';
  const lastVisibility = useRef(visibility);
  const position = useRef(initialPosition);
  const start = restingPoint(initialPosition, screen);
  const x = useSharedValue(start.x);
  const y = useSharedValue(start.y);
  const dragFromX = useSharedValue(start.x);
  const dragFromY = useSharedValue(start.y);
  const scale = useSharedValue(1);
  const dim = useSharedValue(1);
  const intro = useSharedValue(appear === 'instant' ? 1 : 0);
  const fade = useSharedValue(faded ? 0 : 1);
  const pop = useSharedValue(1);

  useEffect(() => {
    const point = restingPoint(position.current, screen);

    x.set(point.x);
    y.set(point.y);
  }, [screen, x, y]);

  useEffect(() => {
    switch (appear) {
      case 'entrance':
        // The first appearance coincides with the splash fading out, which would hide most of the entrance.
        intro.set(
          withDelay(
            motion.splashFadeMs,
            reduceMotion
              ? withTiming(1, { duration: chatButton.fade.durationMs, easing: FADE_EASING })
              : withTiming(1, { duration: chatButton.entrance.durationMs, easing: ENTRANCE_EASING }),
          ),
        );
        break;
      case 'instant':
        break;
      default: {
        const _exhaustive: never = appear;

        return _exhaustive;
      }
    }

    onShown();
  }, [appear, reduceMotion, intro, onShown]);

  useEffect(() => {
    const backFromSheet = lastVisibility.current === 'under-sheet' && visibility === 'shown';

    lastVisibility.current = visibility;

    if (backFromSheet) {
      const timing = { duration: chatButton.popBack.durationMs, easing: ENTRANCE_EASING };

      if (!reduceMotion) {
        pop.set(withSequence(withTiming(chatButton.entrance.fromScale, { duration: 0 }), withTiming(1, timing)));
      }

      fade.set(withTiming(1, timing));

      return;
    }

    fade.set(withTiming(faded ? 0 : 1, { duration: chatButton.fade.durationMs, easing: FADE_EASING }));
  }, [visibility, faded, reduceMotion, fade, pop]);

  function commit(next: ButtonPosition) {
    position.current = next;
    onMoved(next);
  }

  const pan = usePanGesture({
    testID: PAN_TEST_ID,
    enabled: !faded,
    maxPointers: 1,
    onBegin: () => {
      'worklet';

      if (reduceMotion) {
        dim.set(withTiming(press.reducedMotionOpacity, { duration: press.durationMs, easing: PRESS_EASING }));
      } else {
        scale.set(withTiming(press.scale, { duration: press.durationMs, easing: PRESS_EASING }));
      }
    },
    onActivate: (event) => {
      'worklet';
      cancelAnimation(x);
      cancelAnimation(y);

      // Anchor on where the button is now, not where it was at touch-down, so a catch mid-spring doesn't jump.
      dragFromX.set(x.get() - event.translationX);
      dragFromY.set(y.get() - event.translationY);
    },
    onUpdate: (event) => {
      'worklet';
      x.set(Math.min(Math.max(dragFromX.get() + event.translationX, 0), screen.width - chatButton.touch));
      y.set(Math.min(Math.max(dragFromY.get() + event.translationY, screen.insetTop), screen.height - chatButton.touch));
    },
    onDeactivate: (event) => {
      'worklet';

      const next = positionFromRelease(
        { centerX: x.get() + chatButton.touch / 2, centerY: y.get() + chatButton.touch / 2 },
        screen,
      );

      const target = restingPoint(next, screen);

      if (reduceMotion) {
        x.set(target.x);
        y.set(target.y);
      } else {
        const spring = { duration: chatButton.snapSpring.response * 1000, dampingRatio: chatButton.snapSpring.dampingRatio };

        x.set(withSpring(target.x, { ...spring, velocity: event.velocityX }));
        y.set(withSpring(target.y, { ...spring, velocity: event.velocityY }));
      }

      scheduleOnRN(commit, next);
      scheduleOnRN(Haptics.impactAsync, Haptics.ImpactFeedbackStyle.Light);
    },
    onFinalize: () => {
      'worklet';
      scale.set(withTiming(1, { duration: press.durationMs, easing: PRESS_EASING }));
      dim.set(withTiming(1, { duration: press.durationMs, easing: PRESS_EASING }));
    },
  });

  const tap = useTapGesture({
    testID: TAP_TEST_ID,
    enabled: !faded,
    onDeactivate: () => {
      'worklet';
      scheduleOnRN(onPress);
    },
  });

  const gesture = useCompetingGestures(pan, tap);

  const animatedStyle = useAnimatedStyle(() => {
    const { fromScale } = chatButton.entrance;
    const introScale = reduceMotion ? 1 : fromScale + (1 - fromScale) * intro.get();

    return {
      opacity: intro.get() * fade.get() * dim.get(),
      transform: [{ translateX: x.get() }, { translateY: y.get() }, { scale: introScale * pop.get() * scale.get() }],
    };
  });

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        accessible
        accessibilityRole="button"
        accessibilityLabel={chatButton.accessibilityLabel}
        accessibilityElementsHidden={faded}
        importantForAccessibility={faded ? 'no-hide-descendants' : 'auto'}
        pointerEvents={faded ? 'none' : 'auto'}
        onAccessibilityTap={onPress}
        style={[styles.touch, shadow.chatButton, animatedStyle]}
      >
        <Mochi palette={palette} blink={!reduceMotion} />
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  touch: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: chatButton.touch,
    height: chatButton.touch,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
