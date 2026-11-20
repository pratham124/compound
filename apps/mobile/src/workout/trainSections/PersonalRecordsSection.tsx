import { Text, View } from 'react-native';

import { type } from '../../theme/tokens.ts';
import { useAppearance } from '../../theme/useAppearance.ts';
import { sectionStyles } from './sectionStyles.ts';

export function PersonalRecordsSection() {
  const { palette } = useAppearance();

  return (
    <View accessibilityLabel="Personal records" style={sectionStyles.section}>
      <Text accessibilityRole="header" style={[type.subheadline, sectionStyles.groupHeading, { color: palette.secondary }]}>Personal records</Text>
      <View style={[sectionStyles.group, { backgroundColor: palette.card }]}>
        <Text style={[type.subheadline, sectionStyles.empty, { color: palette.secondary }]}>Personal records aren't tracked yet.</Text>
      </View>
    </View>
  );
}
