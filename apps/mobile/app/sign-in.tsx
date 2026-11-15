import * as AppleAuthentication from 'expo-apple-authentication';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { authClient } from '../src/auth/authClient.ts';
import { requestAppleIdentityToken } from '../src/auth/appleCredential.ts';
import { appleUser, signInWithApple } from '../src/auth/signIn.ts';
import { BrandTile } from '../src/components/BrandTile.tsx';
import { Button } from '../src/components/Button.tsx';
import { noticeMotion } from '../src/motion/layoutAnimations.ts';
import { brand, layout, space, type } from '../src/theme/tokens.ts';
import { useAppearance } from '../src/theme/useAppearance.ts';

const BUTTON_HEIGHT = 54;

export default function SignIn() {
  const { scheme, palette } = useAppearance();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [failed, setFailed] = useState(false);
  const { entering, exiting } = noticeMotion();
  // A ref, not state: a second tap can land before React re-renders, and iOS rejects a second
  // Apple request while one is open, which would show "Couldn't sign in" for a sign-in that is still going.
  const appleInFlight = useRef(false);

  const onApple = async () => {
    if (appleInFlight.current) {
      return;
    }

    appleInFlight.current = true;

    const outcome = await signInWithApple({
      requestAppleIdentityToken,
      exchange: async ({ token, fullName }) => {
        const { error } = await authClient.signIn.social({
          provider: 'apple',
          idToken: { token, user: appleUser(fullName) },
        });

        return { ok: error === null };
      },
    });

    appleInFlight.current = false;
    setFailed(outcome.kind === 'failed');
  };

  return (
    <View style={[styles.screen, { backgroundColor: brand.signInField[scheme] }]}>
      <ScrollView contentContainerStyle={styles.hero}>
        <View style={styles.topSpace} />
        <BrandTile palette={palette} scheme={scheme} />
        <Text style={[type.largeTitle, styles.title, { color: palette.label }]}>Compound</Text>
        <Text style={[type.body, styles.tagline, { color: palette.secondary }]}>
          Training, sleep and spending, in one calm place.
        </Text>
      </ScrollView>
      <View style={[styles.actions, { paddingBottom: Math.max(insets.bottom, space.lg) + space.xxl }]}>
        {failed ? (
          <Animated.Text
            accessibilityRole="alert"
            entering={entering}
            exiting={exiting}
            style={[type.subheadline, styles.error, { color: palette.danger }]}
          >
            Couldn't sign in. Try again.
          </Animated.Text>
        ) : null}
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
          buttonStyle={
            scheme === 'dark'
              ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
              : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
          }
          cornerRadius={BUTTON_HEIGHT / 2}
          onPress={onApple}
          style={styles.apple}
        />
        <Button
          palette={palette}
          variant="quiet"
          label="Use an email code instead"
          onPress={() => router.push('/email-code')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  hero: { flexGrow: 1, alignItems: 'center', paddingHorizontal: layout.screenMargin + space.xs },
  // 132 pt on a tall phone, shrinking to nothing when large text or a small screen needs the room.
  topSpace: { flexGrow: 1, flexShrink: 1, maxHeight: 132 },
  title: { marginTop: space.xxl, textAlign: 'center' },
  tagline: { marginTop: space.sm, maxWidth: 304, textAlign: 'center' },
  actions: { paddingHorizontal: layout.screenMargin, gap: space.xs },
  error: { textAlign: 'center' },
  apple: { height: BUTTON_HEIGHT },
});
