import * as Haptics from 'expo-haptics';
import { useState, type ReactNode } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { cubicBezier } from 'react-native-reanimated';

import { useReduceMotion } from '../accessibility/useReduceMotion.ts';
import { press } from '../theme/tokens.ts';

export type PressableScaleProps = Omit<PressableProps, 'style' | 'children'> & {
  style?: StyleProp<ViewStyle>;
  /** How far it shrinks while pressed. */
  pressedScale?: number;
  /** A light tap on a real press, not when the finger lands, so a scroll that starts on the button stays silent. Turn it off where something else already gives feedback. */
  haptic?: 'light' | 'none';
  /** A second motion on the children alone while pressed, so an icon tilts or turns inside the shrinking button. */
  glyphPress?: GlyphPress;
  children: ReactNode;
};

export type GlyphPress = { rotateDeg: number; scale: number };

export function PressableScale({
  style,
  children,
  pressedScale = press.scale,
  haptic = 'light',
  glyphPress,
  onPressIn,
  onPressOut,
  onPress,
  ...rest
}: PressableScaleProps) {
  const [pressed, setPressed] = useState(false);
  const reduceMotion = useReduceMotion();

  const feedback = reduceMotion
    ? { opacity: pressed ? press.reducedMotionOpacity : 1, transitionProperty: 'opacity' as const }
    : { transform: [{ scale: pressed ? pressedScale : 1 }], transitionProperty: 'transform' as const };

  const timing = { transitionDuration: press.durationMs, transitionTimingFunction: cubicBezier(...press.easing) };

  return (
    <Pressable
      {...rest}
      onPressIn={(event) => {
        setPressed(true);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        setPressed(false);
        onPressOut?.(event);
      }}
      onPress={(event) => {
        if (haptic === 'light') {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }

        onPress?.(event);
      }}
    >
      <Animated.View style={[style, feedback, timing]}>
        {glyphPress === undefined || reduceMotion ? (
          children
        ) : (
          <Animated.View
            testID="press-glyph"
            style={[
              {
                transform: [{ rotate: `${pressed ? glyphPress.rotateDeg : 0}deg` }, { scale: pressed ? glyphPress.scale : 1 }],
                transitionProperty: 'transform',
              },
              timing,
            ]}
          >
            {children}
          </Animated.View>
        )}
      </Animated.View>
    </Pressable>
  );
}
