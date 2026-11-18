import { useRouter } from 'expo-router';
import { StyleSheet } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { PressableScale } from '../components/PressableScale.tsx';
import { glassShadow, layout, press, radius } from '../theme/tokens.ts';
import { useAppearance } from '../theme/useAppearance.ts';

export function ExerciseSearchButton() {
  const router = useRouter();
  const { palette } = useAppearance();

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel="Search exercises"
      pressedScale={press.iconScale}
      glyphPress={press.glyph.search}
      onPress={() => router.push('/exercises')}
      style={[styles.button, { backgroundColor: palette.glass, boxShadow: glassShadow(palette) }]}
    >
      <Svg width={24} height={24} viewBox="0 0 24 24" accessible={false}>
        <Circle cx={10.5} cy={10.5} r={6.5} fill="none" stroke={palette.label} strokeWidth={1.8} />
        <Path d="m16 16 4 4" stroke={palette.label} strokeWidth={1.8} strokeLinecap="round" />
      </Svg>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  button: { width: layout.headerButton, height: layout.headerButton, borderRadius: radius.capsule, alignItems: 'center', justifyContent: 'center' },
});
