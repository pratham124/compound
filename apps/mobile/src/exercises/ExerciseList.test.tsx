import { fireEvent, render, screen } from '@testing-library/react-native';

import { exercises } from './catalogue.ts';
import { ExerciseList } from './ExerciseList.tsx';

it('lets a person search, filter and open an exercise from the bundled list', async () => {
  const select = jest.fn();

  await render(<ExerciseList onSelect={select} />);
  await fireEvent.changeText(screen.getByLabelText('Search exercises'), 'incline dumbbell press');
  await fireEvent.press(screen.getByRole('button', { name: 'Chest' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Incline Dumbbell Press, Dumbbell' }));

  expect(select).toHaveBeenCalledWith('Incline_Dumbbell_Press');
  await fireEvent.press(screen.getByRole('button', { name: 'Legs' }));
  expect(screen.getByText('No matching exercises')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'All' }));
  expect(screen.getByRole('button', { name: 'Incline Dumbbell Press, Dumbbell' })).toBeOnTheScreen();
});

it('marks only the exercises already in the workout', async () => {
  await render(<ExerciseList compact inWorkout={new Set(exercises.filter((exercise) => exercise.name === 'Incline Dumbbell Press').map((exercise) => exercise.id))} onSelect={() => {}} />);
  await fireEvent.changeText(screen.getByLabelText('Search exercises'), 'dumbbell press');

  const marked = screen.getByRole('button', { name: 'Incline Dumbbell Press, Dumbbell, in workout' });

  expect(marked.props.accessibilityHint).toBe('Goes to it in your workout.');
  expect(screen.getByText('Dumbbell · In workout')).toBeOnTheScreen();
  expect(screen.getAllByText('In workout', { exact: false })).toHaveLength(1);
  expect(screen.queryAllByLabelText(/in workout$/)).toHaveLength(1);
});
