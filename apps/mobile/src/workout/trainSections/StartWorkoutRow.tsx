import { ActivityIndicator, Text, View } from 'react-native';

import { Blob } from '../../components/Blob.tsx';
import { PressableScale } from '../../components/PressableScale.tsx';
import { type } from '../../theme/tokens.ts';
import { useAppearance } from '../../theme/useAppearance.ts';
import { sectionStyles } from './sectionStyles.ts';

const PLAY_ICON = 'M9 5.5L18.5 12 9 18.5Z';

type StartWorkoutRowProps = {
  starting: boolean;
  disabled: boolean;
  onStart: () => void;
};

// Deliberately its own row under Next day, not under Other routines as the mock has it.
export function StartWorkoutRow({ starting, disabled, onStart }: StartWorkoutRowProps) {
  const { palette } = useAppearance();
  const inactive = disabled || starting;

  return (
    <View style={[sectionStyles.group, { backgroundColor: palette.card }]}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel="Start workout"
        accessibilityState={{ busy: starting, disabled: inactive }}
        disabled={inactive}
        onPress={onStart}
        style={sectionStyles.row}
      >
        <Blob tint={palette.accentSoft} stroke={inactive ? palette.secondary : palette.accent} iconPath={PLAY_ICON} />
        <Text style={[type.body, sectionStyles.rowLabel, { color: inactive ? palette.secondary : palette.accent }]}>Start workout</Text>
        {starting ? <ActivityIndicator color={palette.accent} /> : null}
      </PressableScale>
    </View>
  );
}
