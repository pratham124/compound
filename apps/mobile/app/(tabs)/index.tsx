import { StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';

import { useServerStatus } from '../../src/api/useServerStatus.ts';
import { useAuthClient } from '../../src/auth/AuthClientContext.tsx';
import { ProfileButton } from '../../src/components/ProfileButton.tsx';
import { ServerStatusCard } from '../../src/components/ServerStatusCard.tsx';
import { TabScreen } from '../../src/components/TabScreen.tsx';
import { TodayGreeting } from '../../src/components/TodayGreeting.tsx';
import { slideLayout } from '../../src/motion/layoutAnimations.ts';
import { useAppearance } from '../../src/theme/useAppearance.ts';

export default function TodayScreen() {
  const { palette } = useAppearance();
  const { status, refresh } = useServerStatus();
  const { data: session } = useAuthClient().useSession();

  return (
    <TabScreen
      title="Today"
      subtitle={<TodayGreeting name={session?.user.name ?? ''} />}
      trailing={<ProfileButton />}
    >
      <Animated.View layout={slideLayout} style={styles.statusSlot}>
        <ServerStatusCard palette={palette} status={status} onRetry={refresh} />
      </Animated.View>
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  statusSlot: { alignSelf: 'stretch' },
});
