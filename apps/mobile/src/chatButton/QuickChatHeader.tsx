import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { PressableScale } from '../components/PressableScale.tsx';
import { glassEdge, layout, radius, type } from '../theme/tokens.ts';
import { useAppearance } from '../theme/useAppearance.ts';

export type QuickChatHeaderProps = { onClose: () => void };

const CLOSE_SIZE = 36;
const CLOSE_GLYPH = 14;
const CLOSE_SLOP = (layout.minTouch - CLOSE_SIZE) / 2;

/**
 * The sheet's top row: the title centred, and a round glass close button on the right, the way current iOS sheets close.
 * The sides are the same width, so the title stays centred with the left side empty.
 */
export function QuickChatHeader({ onClose }: QuickChatHeaderProps) {
  const { palette } = useAppearance();

  return (
    <View style={styles.row}>
      <View style={styles.side} />
      <Text accessibilityRole="header" numberOfLines={1} style={[type.headline, styles.title, { color: palette.label }]}>
        Ask Compound
      </Text>
      <View style={styles.sideRight}>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={CLOSE_SLOP}
          onPress={onClose}
          style={[styles.close, { backgroundColor: palette.glass, boxShadow: glassEdge(palette) }]}
        >
          <Svg width={CLOSE_GLYPH} height={CLOSE_GLYPH} viewBox="0 0 12 12">
            <Path d="M1.5 1.5l9 9M10.5 1.5l-9 9" stroke={palette.label} strokeWidth={1.8} strokeLinecap="round" />
          </Svg>
        </PressableScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', minHeight: layout.minTouch },
  // At large text sizes the title is what gets cut off; the sides keep room for the close button.
  side: { flex: 1, minWidth: layout.minTouch },
  sideRight: { flex: 1, minWidth: layout.minTouch, alignItems: 'flex-end' },
  title: { flexShrink: 1 },
  close: { width: CLOSE_SIZE, height: CLOSE_SIZE, borderRadius: radius.capsule, alignItems: 'center', justifyContent: 'center' },
});
