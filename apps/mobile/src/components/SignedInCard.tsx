import { StyleSheet, Text } from 'react-native';
import Animated from 'react-native-reanimated';

import { signedInLabel, type SignedInLabel } from '../auth/signIn.ts';
import { noticeMotion } from '../motion/layoutAnimations.ts';
import { layout, radius, space, type, type Palette } from '../theme/tokens.ts';
import { Button } from './Button.tsx';

export type SignedInCardProps = {
  palette: Palette;
  user: { name: string; email: string };
  onSignOut: () => void;
  signingOut: boolean;
  signOutFailed: boolean;
};

/** Names wrap; an email stays on one line, shortened in the middle so its start and domain both show. */
function Identity({ label, palette }: { label: SignedInLabel; palette: Palette }) {
  switch (label.kind) {
    case 'name':
      return (
        <>
          <Text style={[type.subheadline, { color: palette.secondary }]}>Signed in as</Text>
          <Text style={[type.headline, { color: palette.label }]}>{label.name}</Text>
        </>
      );
    case 'email':
      return (
        <>
          <Text style={[type.subheadline, { color: palette.secondary }]}>Signed in as</Text>
          <Text
            accessibilityLabel={label.email}
            ellipsizeMode="middle"
            numberOfLines={1}
            style={[type.headline, { color: palette.label }]}
          >
            {label.email}
          </Text>
        </>
      );
    case 'apple':
      return <Text style={[type.headline, { color: palette.label }]}>Signed in with Apple</Text>;
    default: {
      const _exhaustive: never = label;

      return _exhaustive;
    }
  }
}

export function SignedInCard({ palette, user, onSignOut, signingOut, signOutFailed }: SignedInCardProps) {
  const { entering, exiting, layout: slide } = noticeMotion();

  return (
    <Animated.View layout={slide} style={[styles.card, { backgroundColor: palette.card }]}>
      <Identity label={signedInLabel(user)} palette={palette} />
      {signOutFailed ? (
        <Animated.Text
          accessibilityRole="alert"
          entering={entering}
          exiting={exiting}
          style={[type.subheadline, { color: palette.danger }]}
        >
          Couldn't sign out. Check your connection and try again.
        </Animated.Text>
      ) : null}
      <Animated.View layout={slide}>
        <Button
          palette={palette}
          variant="quiet"
          label="Sign out"
          busy={signingOut}
          minHeight={layout.minTouch}
          onPress={onSignOut}
        />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { alignSelf: 'stretch', borderRadius: radius.card, padding: layout.cardPadding, gap: space.xs },
});
