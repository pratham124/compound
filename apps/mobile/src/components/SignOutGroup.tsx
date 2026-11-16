import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, { cubicBezier } from 'react-native-reanimated';

import { noticeMotion } from '../motion/layoutAnimations.ts';
import { layout, motion, press, radius, space, type, type Palette } from '../theme/tokens.ts';
import { groupRow } from './groupRow.ts';
import { HoldToConfirmRow } from './HoldToConfirmRow.tsx';
import { PressScale } from './PressScale.tsx';

export type SignOutGroupProps = {
  palette: Palette;
  onSignOut: () => void;
  signingOut: boolean;
  signOutFailed: boolean;
};

/** Opacity only, so it is kept under Reduce Motion (it isn't movement). */
const fade = {
  transitionProperty: 'opacity',
  transitionDuration: motion.busyMs,
  transitionTimingFunction: cubicBezier(...press.easing),
} as const;

type DeleteNotice = 'hold' | 'unavailable';

const DELETE_NOTICES: Record<DeleteNotice, string> = {
  hold: 'Hold to delete your account.',
  unavailable: "Deleting your account isn't available yet.",
};

/**
 * Two button rows (`lrow-accent` and `lrow-danger` in the mockup): Sign out, and Delete account, which has to be held.
 * Notices appear under the group. Deleting isn't built yet, so finishing the hold only says so.
 */
export function SignOutGroup({ palette, onSignOut, signingOut, signOutFailed }: SignOutGroupProps) {
  const { entering, exiting, layout: slide } = noticeMotion();
  const [deleteNotice, setDeleteNotice] = useState<DeleteNotice | null>(null);

  return (
    <Animated.View layout={slide} style={[styles.group, { backgroundColor: palette.card }]}>
      <PressScale
        accessibilityRole="button"
        accessibilityState={{ disabled: signingOut, busy: signingOut }}
        disabled={signingOut}
        onPress={onSignOut}
        style={[groupRow, { opacity: signingOut ? 0.5 : 1 }, fade]}
      >
        <Text style={[type.body, styles.label, { color: palette.accent }]}>{signingOut ? 'Signing out…' : 'Sign out'}</Text>
      </PressScale>
      <HoldToConfirmRow
        label="Delete account"
        labelColor={palette.danger}
        tint={palette.dangerTint}
        durationMs={motion.holdToDeleteMs}
        disabled={signingOut}
        accessibilityHint="Double-tap and hold to delete your account"
        onPressStart={() => setDeleteNotice(null)}
        onReleasedEarly={() => setDeleteNotice('hold')}
        onConfirm={() => setDeleteNotice('unavailable')}
      />
      {signOutFailed ? (
        <Animated.Text
          accessibilityRole="alert"
          entering={entering}
          exiting={exiting}
          style={[type.subheadline, styles.notice, { color: palette.danger }]}
        >
          Couldn't sign out. Check your connection and try again.
        </Animated.Text>
      ) : null}
      {deleteNotice === null ? null : (
        <Animated.Text
          accessibilityRole="alert"
          entering={entering}
          exiting={exiting}
          style={[type.subheadline, styles.notice, { color: palette.danger }]}
        >
          {DELETE_NOTICES[deleteNotice]}
        </Animated.Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  group: { alignSelf: 'stretch', borderRadius: radius.card, padding: space.sm, gap: layout.groupGap },
  label: { fontWeight: '600' },
  notice: { paddingVertical: space.sm, paddingHorizontal: 10 },
});
