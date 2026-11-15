import { useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';

import { useServerStatus } from '../../src/api/useServerStatus.ts';
import { useAuthClient } from '../../src/auth/AuthClientContext.tsx';
import { endSessionOnServer } from '../../src/auth/serverSignOut.ts';
import { signOut } from '../../src/auth/signOut.ts';
import { ProfileButton } from '../../src/components/ProfileButton.tsx';
import { ServerStatusCard } from '../../src/components/ServerStatusCard.tsx';
import { SignedInCard } from '../../src/components/SignedInCard.tsx';
import { TabScreen } from '../../src/components/TabScreen.tsx';
import { slideLayout } from '../../src/motion/layoutAnimations.ts';
import { useAppearance } from '../../src/theme/useAppearance.ts';

export default function TodayScreen() {
  const { palette } = useAppearance();
  const { status, refresh } = useServerStatus();
  const authClient = useAuthClient();
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
    <TabScreen title="Today" trailing={<ProfileButton />}>
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
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  statusSlot: { alignSelf: 'stretch' },
});
