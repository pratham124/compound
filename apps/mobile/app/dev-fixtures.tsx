import { Profile } from '@compound/contracts';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ProfileCard } from '../src/components/ProfileCard.tsx';
import { SettingsProfileGroup } from '../src/components/SettingsProfileGroup.tsx';
import { SignOutGroup } from '../src/components/SignOutGroup.tsx';
import type { ProfileState } from '../src/profile/useProfile.ts';
import { layout, radius, space, type } from '../src/theme/tokens.ts';
import { useAppearance } from '../src/theme/useAppearance.ts';

const FIXTURES = [
  { label: 'demo', user: { name: 'Pratham', email: 'pratham@example.com' } },
  {
    label: 'worst',
    user: {
      name: 'Maria Fernanda de los Ángeles Rodríguez-Wiśniewska-Kowalczyk',
      email: 'bartholomew.fitzgerald@northwind-industries-holdings.example.com',
    },
  },
  { label: 'no name, relay email', user: { name: '', email: 'x7k2m9q4r1@privaterelay.appleid.com' } },
  {
    label: 'no name, long email',
    user: { name: '', email: 'bartholomew.fitzgerald@northwind-industries-holdings.example.com' },
  },
] as const;

const PROFILES = [
  { label: 'profile', state: { kind: 'ready', profile: Profile.parse({ timeZone: 'America/Toronto', units: 'metric' }), save: { kind: 'idle' } } },
  {
    label: 'profile worst',
    state: {
      kind: 'ready',
      profile: Profile.parse({ timeZone: 'America/Argentina/Rio_Gallegos', units: 'imperial' }),
      save: { kind: 'failed' },
    },
  },
  {
    label: 'profile saving',
    state: { kind: 'ready', profile: Profile.parse({ timeZone: 'America/Toronto', units: 'metric' }), save: { kind: 'saving', units: 'imperial' } },
  },
  { label: 'profile loading', state: { kind: 'loading' } },
  { label: 'profile failed', state: { kind: 'failed' } },
] as const satisfies readonly { label: string; state: ProfileState }[];

/** Dev only: open compound://dev-fixtures to see the Settings profile group, the units group and the sign-out group with worst-case data. */
export default function DevFixtures() {
  const { palette } = useAppearance();
  const [selected, setSelected] = useState(1);
  const [profileIndex, setProfileIndex] = useState(1);
  const [signOutFailed, setSignOutFailed] = useState(true);

  return (
    <ScrollView style={{ backgroundColor: palette.bg }} contentContainerStyle={styles.content}>
      <SignOutGroup
        palette={palette}
        onSignOut={() => setSignOutFailed((failed) => !failed)}
        signingOut={false}
        signOutFailed={signOutFailed}
      />
      <SettingsProfileGroup palette={palette} user={FIXTURES[selected]?.user ?? FIXTURES[0].user} />
      <ProfileCard
        palette={palette}
        state={PROFILES[profileIndex]?.state ?? PROFILES[0].state}
        onChooseUnits={() => {}}
        onRetry={() => {}}
      />
      <View style={styles.row}>
        {PROFILES.map(({ label }, index) => (
          <Pressable
            key={label}
            accessibilityRole="button"
            onPress={() => setProfileIndex(index)}
            style={[styles.chip, { backgroundColor: index === profileIndex ? palette.accent : palette.card }]}
          >
            <Text style={[type.footnote, { color: index === profileIndex ? palette.onAccent : palette.label }]}>{label}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.row}>
        {FIXTURES.map(({ label }, index) => (
          <Pressable
            key={label}
            accessibilityRole="button"
            onPress={() => setSelected(index)}
            style={[styles.chip, { backgroundColor: index === selected ? palette.accent : palette.card }]}
          >
            <Text style={[type.footnote, { color: index === selected ? palette.onAccent : palette.label }]}>{label}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, justifyContent: 'center', gap: space.xxl, padding: layout.screenMargin },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: { minHeight: layout.minTouch, justifyContent: 'center', paddingHorizontal: space.lg, borderRadius: radius.capsule },
});
