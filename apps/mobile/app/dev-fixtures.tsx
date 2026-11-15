import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { SignedInCard } from '../src/components/SignedInCard.tsx';
import { layout, radius, space, type } from '../src/theme/tokens.ts';
import { useAppearance } from '../src/theme/useAppearance.ts';

const FIXTURES = [
  { label: 'demo', user: { name: 'Pratham', email: 'pratham@example.com' } },
  {
    label: 'worst',
    user: {
      name: 'Aleksandra Wiśniewska-Kowalczyk-Montgomery',
      email: 'bartholomew.fitzgerald@northwind-industries-holdings.example.com',
    },
  },
  { label: 'no name, relay email', user: { name: '', email: 'x7k2m9q4r1@privaterelay.appleid.com' } },
  {
    label: 'no name, long email',
    user: { name: '', email: 'bartholomew.fitzgerald@northwind-industries-holdings.example.com' },
  },
] as const;

/** Dev only: open compound://dev-fixtures to see the signed-in card with worst-case people. */
export default function DevFixtures() {
  const { palette } = useAppearance();
  const [selected, setSelected] = useState(1);
  const [signOutFailed, setSignOutFailed] = useState(true);

  return (
    <ScrollView style={{ backgroundColor: palette.bg }} contentContainerStyle={styles.content}>
      <SignedInCard
        palette={palette}
        user={FIXTURES[selected]?.user ?? FIXTURES[0].user}
        onSignOut={() => setSignOutFailed((failed) => !failed)}
        signingOut={false}
        signOutFailed={signOutFailed}
      />
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
