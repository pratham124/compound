import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { describeChatSource, parseChatSource } from '../src/chatButton/chatSource.ts';
import { layout, space, type } from '../src/theme/tokens.ts';
import { useAppearance } from '../src/theme/useAppearance.ts';

export default function QuickChatSheet() {
  const { palette } = useAppearance();
  const { from } = useLocalSearchParams();

  return (
    <View style={[styles.sheet, { backgroundColor: palette.bg }]}>
      <Text accessibilityRole="header" numberOfLines={1} style={[type.headline, styles.title, { color: palette.label }]}>
        Ask Compound
      </Text>
      <Text style={[type.footnote, { color: palette.secondary }]}>{describeChatSource(parseChatSource(from))}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, paddingHorizontal: layout.screenMargin, paddingTop: space.xl, gap: space.lg },
  title: { textAlign: 'center' },
});
