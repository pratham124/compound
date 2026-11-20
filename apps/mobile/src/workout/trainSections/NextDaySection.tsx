import { Text, View } from 'react-native';

import { type } from '../../theme/tokens.ts';
import { useAppearance } from '../../theme/useAppearance.ts';
import { sectionStyles } from './sectionStyles.ts';

export function NextDaySection() {
  const { palette } = useAppearance();

  return (
    <View accessibilityLabel="Next day" style={[sectionStyles.card, { backgroundColor: palette.card }]}>
      <Text accessibilityRole="header" style={[type.title2, { color: palette.label }]}>No routines yet</Text>
      <Text style={[type.subheadline, { color: palette.secondary }]}>Create one to see what's next.</Text>
    </View>
  );
}
