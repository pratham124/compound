import { ScrollView, StyleSheet, Text, useColorScheme } from 'react-native';

import { useServerStatus } from '../src/api/useServerStatus.ts';
import { ServerStatusCard } from '../src/components/ServerStatusCard.tsx';
import { colors, layout, space, type } from '../src/theme/tokens.ts';

export default function Index() {
  const palette = useColorScheme() === 'dark' ? colors.dark : colors.light;
  const { status, refresh } = useServerStatus();

  return (
    <ScrollView style={{ backgroundColor: palette.bg }} contentContainerStyle={styles.content}>
      <Text style={[type.largeTitle, { color: palette.label }]}>Compound</Text>
      <ServerStatusCard palette={palette} status={status} onRetry={refresh} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Scrolls so the card and its button stay reachable at the largest accessibility text size.
  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xxl,
    paddingHorizontal: layout.screenMargin,
    paddingVertical: space.xxl,
  },
});
