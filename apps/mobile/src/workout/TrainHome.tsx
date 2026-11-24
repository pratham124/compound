import { StyleSheet, View } from 'react-native';

import { layout } from '../theme/tokens.ts';
import { NextDaySection } from './trainSections/NextDaySection.tsx';
import { PastWorkoutsSection } from './trainSections/PastWorkoutsSection.tsx';
import { PersonalRecordsSection } from './trainSections/PersonalRecordsSection.tsx';
import { StartWorkoutRow } from './trainSections/StartWorkoutRow.tsx';

type TrainHomeProps = {
  starting: boolean;
  disabled: boolean;
  onStart: () => void;
};

export function TrainHome({ starting, disabled, onStart }: TrainHomeProps) {
  return (
    <View style={styles.sections}>
      <NextDaySection />
      <StartWorkoutRow starting={starting} disabled={disabled} onStart={onStart} />
      <PastWorkoutsSection />
      <PersonalRecordsSection />
    </View>
  );
}

const styles = StyleSheet.create({
  sections: { gap: layout.cardGap },
});
