import { StyleSheet, Text, View } from 'react-native';

import { SheetCloseButton } from '../components/SheetCloseButton.tsx';
import { layout, space, type } from '../theme/tokens.ts';
import { useAppearance } from '../theme/useAppearance.ts';

export function SheetBar({ title, onClose }: { title: string; onClose: () => void }) {
  const { palette } = useAppearance();

  return (
    <View style={styles.bar}>
      <Text accessibilityRole="header" style={[type.title2, styles.title, { color: palette.label }]}>{title}</Text>
      <SheetCloseButton onPress={onClose} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: layout.minTouch, paddingHorizontal: layout.screenMargin, paddingTop: space.md, paddingBottom: space.md },
  title: { flex: 1 },
});
