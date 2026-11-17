import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { describeChatSource, parseChatSource } from '../src/chatButton/chatSource.ts';
import { closeQuickChat } from '../src/chatButton/closeQuickChat.ts';
import { QuickChatHeader } from '../src/chatButton/QuickChatHeader.tsx';
import { layout, space, type } from '../src/theme/tokens.ts';
import { useAppearance } from '../src/theme/useAppearance.ts';

export default function QuickChatSheet() {
  const { palette } = useAppearance();
  const { from } = useLocalSearchParams();
  const router = useRouter();

  return (
    <View style={[styles.sheet, { backgroundColor: palette.bg }]}>
      <QuickChatHeader onClose={() => closeQuickChat(router)} />
      <Text style={[type.footnote, { color: palette.secondary }]}>{describeChatSource(parseChatSource(from))}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, paddingHorizontal: layout.screenMargin, paddingTop: space.sm, gap: space.lg },
});
