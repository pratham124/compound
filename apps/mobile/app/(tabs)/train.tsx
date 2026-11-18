import { Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TabScreen } from '../../src/components/TabScreen.tsx';
import { ExerciseSearchButton } from '../../src/exercises/ExerciseSearchButton.tsx';
import { useAppearance } from '../../src/theme/useAppearance.ts';

export default function TrainScreen() {
  const { palette } = useAppearance();

  return (
    <SafeAreaView edges={Platform.OS === 'android' ? ['top'] : []} style={[styles.screen, { backgroundColor: palette.bg }]}>
      <TabScreen title="Train" trailing={<ExerciseSearchButton />} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ screen: { flex: 1 } });
