import { render, screen } from '@testing-library/react-native';

import { TrainHome } from './TrainHome.tsx';

it('lays out the five Train sections from the issue as separate placeholders', async () => {
  await render(<TrainHome starting={false} disabled={false} onStart={() => {}} />);

  for (const section of ['Next day', 'Past workouts', 'Routines', 'Personal records', 'Exercise list']) {
    expect(screen.getByLabelText(section)).toBeOnTheScreen();
  }
});
