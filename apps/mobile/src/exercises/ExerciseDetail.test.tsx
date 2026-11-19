import { render, screen } from '@testing-library/react-native';

import { ExerciseDetail } from './ExerciseDetail.tsx';
import { findExercise } from './catalogue.ts';

it('shows the selected exercise instructions, equipment and each image', async () => {
  const exercise = findExercise('Incline_Dumbbell_Press');

  if (exercise === undefined) throw new Error('Known catalogue exercise is missing');

  await render(<ExerciseDetail exercise={exercise} />);

  expect(screen.getByRole('header', { name: 'Incline Dumbbell Press' })).toBeOnTheScreen();
  expect(screen.getByText('Dumbbell')).toBeOnTheScreen();
  expect(screen.getByText('Chest')).toBeOnTheScreen();
  expect(screen.getByText(/Lie back on an incline bench with a dumbbell in each hand atop your thighs/)).toBeOnTheScreen();
  expect(screen.getByLabelText('Incline Dumbbell Press, picture 1 of 2')).toBeOnTheScreen();
  expect(screen.getByLabelText('Incline Dumbbell Press, picture 2 of 2')).toBeOnTheScreen();
});
