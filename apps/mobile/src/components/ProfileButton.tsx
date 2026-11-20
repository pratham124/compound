import { useRouter } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { useSignedInSession } from '../auth/useSignedInSession.ts';
import { initialsOf } from '../profile/initials.ts';
import { glassShadow, layout, press, radius, type } from '../theme/tokens.ts';
import { useAppearance } from '../theme/useAppearance.ts';
import { PersonGlyph } from './PersonGlyph.tsx';
import { PressableScale } from './PressableScale.tsx';

const GLYPH_SIZE = 24;
const INITIALS_SIZE = 20;
const GLYPH_STROKE = 1.8;

export function ProfileButton() {
  const { palette } = useAppearance();
  const router = useRouter();
  const { session } = useSignedInSession();
  const initials = initialsOf(session?.user.name ?? '');

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel="Settings"
      pressedScale={press.iconScale}
      glyphPress={press.glyph.profile}
      onPress={() => router.push('/settings')}
      style={[styles.circle, { backgroundColor: palette.glass, boxShadow: glassShadow(palette) }]}
    >
      {initials === '' ? (
        <PersonGlyph size={GLYPH_SIZE} color={palette.label} strokeWidth={GLYPH_STROKE} />
      ) : (
        <Text maxFontSizeMultiplier={1.2} style={[type.body, styles.initials, { color: palette.label }]}>
          {initials}
        </Text>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  circle: {
    width: layout.headerButton,
    height: layout.headerButton,
    borderRadius: radius.capsule,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { fontSize: INITIALS_SIZE, lineHeight: INITIALS_SIZE + 4, fontWeight: '600' },
});
