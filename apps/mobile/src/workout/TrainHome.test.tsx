import { render, screen } from '@testing-library/react-native';

import { TrainHome } from './TrainHome.tsx';

it('shows Start workout on its own straight below the Next day card, then the other sections, and no exercise list', async () => {
  await render(<TrainHome starting={false} disabled={false} onStart={() => {}} />);

  const shown = screen.getAllByLabelText(/^(Next day|Start workout|Past workouts|Routines|Personal records|Exercise list)$/);

  expect(shown.map((element) => element.props.accessibilityLabel)).toEqual(['Next day', 'Start workout', 'Past workouts', 'Personal records']);
  expect(screen.queryByRole('button', { name: 'All exercises' })).toBeNull();
});
