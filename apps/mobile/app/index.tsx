import { StyleSheet, Text, useColorScheme, View } from 'react-native';

import { colors, type } from '../src/theme/tokens.ts';

export default function Index() {
  const palette = useColorScheme() === 'dark' ? colors.dark : colors.light;

  return (
    <View style={[styles.screen, { backgroundColor: palette.bg }]}>
      <Text style={[type.largeTitle, { color: palette.label }]}>Compound</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
