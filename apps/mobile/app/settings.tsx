import { TimeZone } from '@compound/contracts';
import { StyleSheet, View } from 'react-native';

import { useAuthClient } from '../src/auth/AuthClientContext.tsx';
import { useSignOut } from '../src/auth/useSignOut.ts';
import { useSignedInSession } from '../src/auth/useSignedInSession.ts';
import { ProfileCard } from '../src/components/ProfileCard.tsx';
import { SettingsProfileGroup } from '../src/components/SettingsProfileGroup.tsx';
import { SignOutGroup } from '../src/components/SignOutGroup.tsx';
import { TabScreen } from '../src/components/TabScreen.tsx';
import { fetchProfile, saveUnits } from '../src/profile/profileApi.ts';
import { loadProfileAndCacheUnit, saveUnitsAndCache } from '../src/profile/settingsUnits.ts';
import { useProfile } from '../src/profile/useProfile.ts';
import { space } from '../src/theme/tokens.ts';
import { useAppearance } from '../src/theme/useAppearance.ts';
import { useWorkoutStoreFactory } from '../src/workout/WorkoutStoreContext.ts';

const REQUEST_TIMEOUT_MS = 5000;

const phoneTimeZone = TimeZone.safeParse(Intl.DateTimeFormat().resolvedOptions().timeZone).data;

export default function SettingsScreen() {
  const { palette } = useAppearance();
  const authClient = useAuthClient();
  const openWorkoutStore = useWorkoutStoreFactory();
  const { session } = useSignedInSession();
  const baseUrl = process.env.EXPO_PUBLIC_API_URL;
  const signOut = useSignOut({ baseUrl, authClient });

  const openStore = session === null ? null : () => openWorkoutStore(session.user.id);

  const { state, retry, chooseUnits } = useProfile({
    load: () => loadProfileAndCacheUnit(openStore, async () => fetchProfile({ baseUrl, cookie: await authClient.getCookie(), fetch: globalThis.fetch, timeoutMs: REQUEST_TIMEOUT_MS, timeZone: phoneTimeZone })),
    save: (units) => saveUnitsAndCache(openStore, async () => saveUnits({ baseUrl, cookie: await authClient.getCookie(), fetch: globalThis.fetch, timeoutMs: REQUEST_TIMEOUT_MS, units })),
  });

  return (
    <TabScreen title="Settings">
      <View style={styles.groups}>
        {session === null ? null : <SettingsProfileGroup palette={palette} user={session.user} />}
        <ProfileCard palette={palette} state={state} onChooseUnits={(units) => void chooseUnits(units)} onRetry={retry} />
        <SignOutGroup
          palette={palette}
          onSignOut={() => void signOut.run()}
          signingOut={signOut.signingOut}
          signOutFailed={signOut.failed}
        />
      </View>
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  groups: { gap: space.lg },
});
