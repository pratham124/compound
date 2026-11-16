import { StyleSheet, Text, View } from 'react-native';

import { isAppleRelay, signedInLabel, type SignedInLabel } from '../auth/signIn.ts';
import { initialsOf } from '../profile/initials.ts';
import { fonts, layout, radius, space, type, type Palette } from '../theme/tokens.ts';
import { PersonGlyph } from './PersonGlyph.tsx';

export type SettingsProfileGroupProps = {
  palette: Palette;
  user: { name: string; email: string };
};

const AVATAR_INITIALS_SIZE = 24;
const AVATAR_GLYPH_SIZE = 26;
const AVATAR_GLYPH_STROKE = 1.9;

/**
 * The client doesn't know how the person signed in. A name is shown with their email beneath it, an Apple "Hide My Email"
 * address (random, so never shown) reads "Signed in with Apple", and with no name the email stands alone.
 */
function Who({ label, user, palette }: { label: SignedInLabel; user: SettingsProfileGroupProps['user']; palette: Palette }) {
  switch (label.kind) {
    case 'name':
      return (
        <>
          <Text style={[type.headline, { color: palette.label }]}>{label.name}</Text>
          <Text ellipsizeMode="middle" numberOfLines={1} style={[type.subheadline, { color: palette.secondary }]}>
            {isAppleRelay(user.email) ? 'Signed in with Apple' : user.email}
          </Text>
        </>
      );
    case 'email':
      return (
        <Text ellipsizeMode="middle" numberOfLines={1} style={[type.headline, { color: palette.label }]}>
          {label.email}
        </Text>
      );
    case 'apple':
      return <Text style={[type.headline, { color: palette.label }]}>Signed in with Apple</Text>;
    default: {
      const _exhaustive: never = label;

      return _exhaustive;
    }
  }
}

/** Who is signed in: an avatar with their initials, then their name or email (`.prof` in the mockup). */
export function SettingsProfileGroup({ palette, user }: SettingsProfileGroupProps) {
  const initials = initialsOf(user.name);

  return (
    <View style={[styles.group, { backgroundColor: palette.card }]}>
      <View style={styles.profile}>
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[styles.avatar, { backgroundColor: palette.accentSoft }]}
        >
          {initials === '' ? (
            <PersonGlyph size={AVATAR_GLYPH_SIZE} color={palette.accent} strokeWidth={AVATAR_GLYPH_STROKE} />
          ) : (
            <Text maxFontSizeMultiplier={1.2} style={[styles.initials, { color: palette.accent }]}>
              {initials}
            </Text>
          )}
        </View>
        <View style={styles.who}>
          <Who label={signedInLabel(user)} user={user} palette={palette} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { alignSelf: 'stretch', borderRadius: radius.card, padding: space.sm },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: layout.profileGap,
    paddingVertical: space.md,
    paddingHorizontal: layout.cardPadding,
  },
  avatar: {
    width: layout.avatar,
    height: layout.avatar,
    borderRadius: radius.capsule,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { fontFamily: fonts.text, fontSize: AVATAR_INITIALS_SIZE, fontWeight: '700' },
  who: { flex: 1, minWidth: 0 },
});
