import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { Blob } from '../../components/Blob.tsx';
import { PressableScale } from '../../components/PressableScale.tsx';
import { type } from '../../theme/tokens.ts';
import { useAppearance } from '../../theme/useAppearance.ts';
import { sectionStyles } from './sectionStyles.ts';

const SEARCH_ICON = 'M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13z M16 16l4 4';

export function ExerciseListSection() {
  const { palette } = useAppearance();
  const router = useRouter();

  return (
    <View accessibilityLabel="Exercise list" style={sectionStyles.section}>
      <Text accessibilityRole="header" style={[type.subheadline, sectionStyles.groupHeading, { color: palette.secondary }]}>Exercises</Text>
      <View style={[sectionStyles.group, { backgroundColor: palette.card }]}>
        <PressableScale accessibilityRole="button" accessibilityLabel="All exercises" onPress={() => router.push('/exercises')} style={sectionStyles.row}>
          <Blob tint={palette.accentSoft} stroke={palette.accent} iconPath={SEARCH_ICON} />
          <Text style={[type.body, sectionStyles.rowLabel, { color: palette.accent }]}>All exercises</Text>
        </PressableScale>
      </View>
    </View>
  );
}
