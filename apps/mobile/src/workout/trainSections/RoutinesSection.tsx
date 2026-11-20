import { ActivityIndicator, Text, View } from 'react-native';

import { Blob } from '../../components/Blob.tsx';
import { PressableScale } from '../../components/PressableScale.tsx';
import { type } from '../../theme/tokens.ts';
import { useAppearance } from '../../theme/useAppearance.ts';
import { sectionStyles } from './sectionStyles.ts';

const PLAY_ICON = 'M9 5.5L18.5 12 9 18.5Z';

type RoutinesSectionProps = {
  starting: boolean;
  disabled: boolean;
  onStart: () => void;
};

export function RoutinesSection({ starting, disabled, onStart }: RoutinesSectionProps) {
  const { palette } = useAppearance();
  const inactive = disabled || starting;

  return (
    <View accessibilityLabel="Routines" style={sectionStyles.section}>
      <Text accessibilityRole="header" style={[type.subheadline, sectionStyles.groupHeading, { color: palette.secondary }]}>Routines</Text>
      <View style={[sectionStyles.group, { backgroundColor: palette.card }]}>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="Start workout"
          accessibilityState={{ busy: starting, disabled: inactive }}
          disabled={inactive}
          onPress={onStart}
          style={sectionStyles.row}
        >
          <Blob tint={palette.accentSoft} stroke={palette.accent} iconPath={PLAY_ICON} />
          <Text style={[type.body, sectionStyles.rowLabel, { color: inactive ? palette.secondary : palette.accent }]}>Start workout</Text>
          {starting ? <ActivityIndicator color={palette.accent} /> : null}
        </PressableScale>
      </View>
    </View>
  );
}
