import { fireEvent, render, screen } from '@testing-library/react-native';

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
