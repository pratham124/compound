import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';

import { authClient } from '../src/auth/authClient.ts';
import { useServerStatus } from '../src/api/useServerStatus.ts';
import { endSessionOnServer } from '../src/auth/serverSignOut.ts';
import { signOut } from '../src/auth/signOut.ts';
import { ServerStatusCard } from '../src/components/ServerStatusCard.tsx';
import { slideLayout } from '../src/motion/layoutAnimations.ts';
import { SignedInCard } from '../src/components/SignedInCard.tsx';
import { layout, space, type } from '../src/theme/tokens.ts';
import { useAppearance } from '../src/theme/useAppearance.ts';

export default function Index() {
  const { palette } = useAppearance();
  const { status, refresh } = useServerStatus();
  const { data: session } = authClient.useSession();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutFailed, setSignOutFailed] = useState(false);

  const onSignOut = async () => {
    setSigningOut(true);
    setSignOutFailed(false);

    const outcome = await signOut({
      endSessionOnServer: async () =>
        endSessionOnServer({ baseUrl: process.env.EXPO_PUBLIC_API_URL, cookie: await authClient.getCookie() }),
      clearLocalSession: async () => {
        await authClient.signOut();
      },
    });

    setSigningOut(false);
    setSignOutFailed(outcome.kind === 'failed');
  };

  return (
    <ScrollView style={{ backgroundColor: palette.bg }} contentContainerStyle={styles.content}>
      <Animated.Text layout={slideLayout} style={[type.largeTitle, { color: palette.label }]}>
        Compound
      </Animated.Text>
      {session === null ? null : (
        <SignedInCard
          palette={palette}
          user={session.user}
          onSignOut={onSignOut}
          signingOut={signingOut}
          signOutFailed={signOutFailed}
        />
      )}
      <Animated.View layout={slideLayout} style={styles.statusSlot}>
        <ServerStatusCard palette={palette} status={status} onRetry={refresh} />
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  statusSlot: { alignSelf: 'stretch' },
  // Scrolls so the card and its button stay reachable at the largest accessibility text size.
  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xxl,
    paddingHorizontal: layout.screenMargin,
    paddingVertical: space.xxl,
  },
});
