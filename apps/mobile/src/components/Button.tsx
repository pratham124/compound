import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import Animated, { cubicBezier } from 'react-native-reanimated';

import { layout, motion, press, radius, space, type, type Palette } from '../theme/tokens.ts';
import { PressScale } from './PressScale.tsx';

export type ButtonProps = {
  palette: Palette;
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'quiet';
  disabled?: boolean;
  busy?: boolean;
  minHeight?: number;
};

const fade = {
  transitionProperty: 'opacity',
  transitionDuration: motion.busyMs,
  transitionTimingFunction: cubicBezier(...press.easing),
} as const;

export function Button({
  palette,
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  busy = false,
  minHeight = layout.buttonHeight,
}: ButtonProps) {
  const primary = variant === 'primary';
  const color = primary ? palette.onAccent : palette.accent;

  return (
    <PressScale
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || busy, busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={[
        styles.button,
        { minHeight, backgroundColor: primary ? palette.accent : 'transparent', opacity: disabled ? 0.5 : 1 },
        fade,
      ]}
    >
      <Animated.View style={[{ opacity: busy ? 0 : 1 }, fade]}>
        <Text style={[type.callout, styles.label, { color }]}>{label}</Text>
      </Animated.View>
      <Animated.View pointerEvents="none" style={[styles.spinner, { opacity: busy ? 1 : 0 }, fade]}>
        <ActivityIndicator color={color} />
      </Animated.View>
    </PressScale>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: radius.capsule,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
  },
  label: { fontWeight: '600', textAlign: 'center' },
  spinner: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
});
