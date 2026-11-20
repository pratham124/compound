import { ActionSheetIOS, Alert, Platform } from 'react-native';

import type { WorkoutExercise } from './workout.ts';
import type { WorkoutRemoval } from './workoutRemoval.ts';

export function showWorkoutMenu(exercise: WorkoutExercise, name: string, onRemove: (removal: WorkoutRemoval) => void) {
  const removeExercise = () => onRemove({ kind: 'exercise', exerciseId: exercise.id });

  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions({ title: name, options: ['Remove exercise', 'Cancel'], destructiveButtonIndex: 0, cancelButtonIndex: 1 }, (index) => {
      if (index === 0) {
        removeExercise();
      }
    });

    return;
  }

  Alert.alert(`Remove ${name}?`, 'Its sets will be removed from this workout.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Remove exercise', style: 'destructive', onPress: removeExercise },
  ]);
}
