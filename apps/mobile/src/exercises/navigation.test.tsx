import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';

import Train from '../../app/(tabs)/train.tsx';
import Exercises from '../../app/exercises/index.tsx';
import Exercise from '../../app/exercises/[id].tsx';
import { WorkoutTestProvider } from '../workout/WorkoutTestProvider.tsx';

it('opens the exercise catalogue from Train and pushes the selected detail page', async () => {
  await renderRouter({ train: Train, 'exercises/index': Exercises, 'exercises/[id]': Exercise }, { initialUrl: '/train', wrapper: WorkoutTestProvider });
  await fireEvent.press(screen.getByRole('button', { name: 'Search exercises' }));
  await waitFor(() => expect(screen).toHavePathname('/exercises'));
  await fireEvent.changeText(screen.getByLabelText('Search exercises'), 'incline dumbbell press');
  await fireEvent.press(screen.getByRole('button', { name: 'Incline Dumbbell Press, Dumbbell' }));
  await waitFor(() => expect(screen).toHavePathname('/exercises/Incline_Dumbbell_Press'));

  expect(screen.getByRole('header', { name: 'How to do it' })).toBeOnTheScreen();
});
