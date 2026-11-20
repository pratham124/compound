import { StyleSheet, Text, View } from 'react-native';

import { SheetCloseButton } from '../components/SheetCloseButton.tsx';
import { layout, type } from '../theme/tokens.ts';
import { useAppearance } from '../theme/useAppearance.ts';

export type QuickChatHeaderProps = { onClose: () => void };

/**
 * The sheet's top row: the title centred, and the round close button on the right.
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
        <SheetCloseButton onPress={onClose} />
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
});
