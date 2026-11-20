import { StyleSheet, View } from 'react-native';

import { layout } from '../theme/tokens.ts';
import { ExerciseListSection } from './trainSections/ExerciseListSection.tsx';
import { NextDaySection } from './trainSections/NextDaySection.tsx';
import { PastWorkoutsSection } from './trainSections/PastWorkoutsSection.tsx';
import { PersonalRecordsSection } from './trainSections/PersonalRecordsSection.tsx';
import { RoutinesSection } from './trainSections/RoutinesSection.tsx';

type TrainHomeProps = {
  starting: boolean;
  disabled: boolean;
  onStart: () => void;
};

export function TrainHome({ starting, disabled, onStart }: TrainHomeProps) {
  return (
    <View style={styles.sections}>
      <NextDaySection />
      <PastWorkoutsSection />
      <RoutinesSection starting={starting} disabled={disabled} onStart={onStart} />
      <PersonalRecordsSection />
      <ExerciseListSection />
    </View>
  );
}

const styles = StyleSheet.create({
  sections: { gap: layout.cardGap },
});
