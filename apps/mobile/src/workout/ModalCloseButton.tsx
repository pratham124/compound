import { StyleSheet, Text } from 'react-native';

import { PressableScale } from '../components/PressableScale.tsx';
import { layout, space, type } from '../theme/tokens.ts';
import { useAppearance } from '../theme/useAppearance.ts';

export function ModalCloseButton({ label, onPress }: { label: string; onPress: () => void }) {
  const { palette } = useAppearance();

  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.button}>
      <Text style={[type.body, styles.done, { color: palette.accent }]}>{label}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  button: { minWidth: layout.minTouch, minHeight: layout.minTouch, paddingHorizontal: space.sm, justifyContent: 'center' },
  done: { fontWeight: '600' },
});
