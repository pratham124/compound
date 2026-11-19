import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { WorkoutLogger } from './WorkoutLogger.tsx';
import { Workout } from './workout.ts';

const workout = Workout.parse({
  id: '00000000-0000-4000-8000-000000000003', startedAt: 1000, finishedAt: null,
  exercises: [{ id: '00000000-0000-4000-8000-000000000004', exerciseId: 'Pushups', sets: [
    { id: '00000000-0000-4000-8000-000000000005', reps: '8', weight: '', unit: 'kg', done: false },
  ] }],
});

it('ticks visible seconds without rerendering the exercise fields', async () => {
  jest.useFakeTimers();

  try {
    await render(<WorkoutLogger workout={{ ...workout, startedAt: Date.now() - 1000 }} unit="kg" saving={false} error={false} finishing={false} onChange={() => {}} onFinish={() => {}} onAddExercise={() => {}} />);
    const fieldStyle = screen.getByLabelText('Set 1 reps').props.style;
    const clock = screen.getByTestId('workout-clock').props.children;

    await act(async () => { jest.advanceTimersByTime(1000); });
    expect(screen.getByTestId('workout-clock').props.children).not.toBe(clock);
    expect(screen.getByLabelText('Set 1 reps').props.style).toBe(fieldStyle);
  } finally {
    jest.useRealTimers();
  }
});

it('logs a weightless set and exposes editable numeric fields and finish', async () => {
  const change = jest.fn();
  const finish = jest.fn();

  await render(<WorkoutLogger workout={workout} unit="lb" saving={false} error={false} finishing={false} onChange={change} onFinish={finish} onAddExercise={() => {}} />);
  await fireEvent.changeText(screen.getByLabelText('Set 1 weight in lb'), '22.5');
  expect(change.mock.calls[0]?.[0].exercises[0].sets[0]).toMatchObject({ weight: '22.5', unit: 'lb' });
  await fireEvent.press(screen.getByRole('checkbox', { name: 'Set 1 done' }));
  expect(change.mock.calls[1]?.[0].exercises[0].sets[0]).toMatchObject({ done: true, weight: '', reps: '8' });
  await fireEvent.press(screen.getByRole('button', { name: 'Finish' }));
  expect(finish).toHaveBeenCalledTimes(1);
});
