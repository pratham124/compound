import { ScrollView } from 'react-native';

import { useAppearance } from '../src/theme/useAppearance.ts';

export default function SettingsScreen() {
  const { palette } = useAppearance();

  return (
    <ScrollView
      style={{ backgroundColor: palette.bg }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ flexGrow: 1 }}
    />
  );
}
