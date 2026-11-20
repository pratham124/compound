import { StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { glassEdge, layout, press, radius } from '../theme/tokens.ts';
import { useAppearance } from '../theme/useAppearance.ts';
import { PressableScale } from './PressableScale.tsx';

const CLOSE_SIZE = 36;
const CLOSE_GLYPH = 14;
const CLOSE_SLOP = (layout.minTouch - CLOSE_SIZE) / 2;

/** The round glass close button at the top right of a sheet, the way current iOS sheets close. */
export function SheetCloseButton({ onPress }: { onPress: () => void }) {
  const { palette } = useAppearance();

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel="Close"
      hitSlop={CLOSE_SLOP}
      glyphPress={press.glyph.close}
      onPress={onPress}
      style={[styles.close, { backgroundColor: palette.glass, boxShadow: glassEdge(palette) }]}
    >
      <Svg width={CLOSE_GLYPH} height={CLOSE_GLYPH} viewBox="0 0 12 12">
        <Path d="M1.5 1.5l9 9M10.5 1.5l-9 9" stroke={palette.label} strokeWidth={1.8} strokeLinecap="round" />
      </Svg>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  close: { width: CLOSE_SIZE, height: CLOSE_SIZE, borderRadius: radius.capsule, alignItems: 'center', justifyContent: 'center' },
});
