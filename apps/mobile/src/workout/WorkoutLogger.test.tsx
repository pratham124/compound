import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { WorkoutLogger } from './WorkoutLogger.tsx';
import { Workout } from './workout.ts';

function Root({ children }: { children: ReactNode }) {
  return <GestureHandlerRootView>{children}</GestureHandlerRootView>;
}

const workout = Workout.parse({
  id: '00000000-0000-4000-8000-000000000003', startedAt: 1000, finishedAt: null,
  exercises: [{ id: '00000000-0000-4000-8000-000000000004', exerciseId: 'Pushups', sets: [
    { id: '00000000-0000-4000-8000-000000000005', reps: '8', weight: '', unit: 'kg', done: false },
  ] }],
});

it('ticks visible seconds without rerendering the exercise fields', async () => {
  jest.useFakeTimers();

  try {
    await render(<WorkoutLogger workout={{ ...workout, startedAt: Date.now() - 1000 }} unit="kg" error={false} finishing={false} onChange={() => {}} onRemove={() => {}} onFinish={() => {}} onAddExercise={() => {}} focus={null} onFocusHandled={() => {}} />, { wrapper: Root });
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

  await render(<WorkoutLogger workout={workout} unit="lb" error={false} finishing={false} onChange={change} onRemove={() => {}} onFinish={finish} onAddExercise={() => {}} focus={null} onFocusHandled={() => {}} />, { wrapper: Root });
  await fireEvent.changeText(screen.getByLabelText('Set 1 weight in lb'), '22.5');
  expect(change.mock.calls[0]?.[0].exercises[0].sets[0]).toMatchObject({ weight: '22.5', unit: 'lb' });
  await fireEvent.press(screen.getByRole('checkbox', { name: 'Set 1 done' }));
  expect(change.mock.calls[1]?.[0].exercises[0].sets[0]).toMatchObject({ done: true, weight: '', reps: '8' });
  await fireEvent.press(screen.getByRole('button', { name: 'Finish' }));
  expect(finish).toHaveBeenCalledTimes(1);
});

it('removes a set through its delete accessibility action, and not while finishing', async () => {
  const remove = jest.fn();
  const logger = (finishing: boolean) => <WorkoutLogger workout={workout} unit="kg" error={false} finishing={finishing} onChange={() => {}} onRemove={remove} onFinish={() => {}} onAddExercise={() => {}} focus={null} onFocusHandled={() => {}} />;
  const view = await render(logger(false), { wrapper: Root });
  const setNumber = screen.getByLabelText('Set 1');

  expect(setNumber.props.accessibilityActions).toEqual([{ name: 'delete', label: 'Delete set' }]);
  await fireEvent(setNumber, 'accessibilityAction', { nativeEvent: { actionName: 'delete' } });
  expect(remove).toHaveBeenCalledWith({ kind: 'set', exerciseId: workout.exercises[0]?.id, setId: workout.exercises[0]?.sets[0]?.id });

  remove.mockClear();
  await view.rerender(logger(true));
  await fireEvent(screen.getByLabelText('Set 1'), 'accessibilityAction', { nativeEvent: { actionName: 'delete' } });
  expect(remove).not.toHaveBeenCalled();
});

it('marks the first unticked set in the workout as up next, across exercises, and no set once all are done', async () => {
  const sets = (done: [boolean, boolean, boolean]) => Workout.parse({
    ...workout,
    exercises: [
      { id: '00000000-0000-4000-8000-000000000004', exerciseId: 'Pushups', sets: [
        { id: '00000000-0000-4000-8000-000000000005', reps: '8', weight: '', unit: 'kg', done: done[0] },
        { id: '00000000-0000-4000-8000-000000000006', reps: '8', weight: '', unit: 'kg', done: done[1] },
      ] },
      { id: '00000000-0000-4000-8000-000000000007', exerciseId: 'Pushups', sets: [
        { id: '00000000-0000-4000-8000-000000000008', reps: '8', weight: '', unit: 'kg', done: done[2] },
      ] },
    ],
  });

  const logger = (current: Workout) => <WorkoutLogger workout={current} unit="kg" error={false} finishing={false} onChange={() => {}} onRemove={() => {}} onFinish={() => {}} onAddExercise={() => {}} focus={null} onFocusHandled={() => {}} />;
  const upNext = () => screen.getAllByLabelText(/^Set \d$/).map((cell) => cell.props.accessibilityValue?.text ?? null);
  const view = await render(logger(sets([false, false, false])), { wrapper: Root });

  expect(upNext()).toEqual(['Up next', null, null]);
  await view.rerender(logger(sets([true, false, false])));
  expect(upNext()).toEqual([null, 'Up next', null]);
  await view.rerender(logger(sets([true, true, false])));
  expect(upNext()).toEqual([null, null, 'Up next']);
  await view.rerender(logger(sets([true, true, true])));
  expect(upNext()).toEqual([null, null, null]);
});

it('shows one Add exercise button inside the empty-state card, and the outlined one once an exercise exists', async () => {
  const add = jest.fn();
  const logger = (current: Workout, finishing = false) => <WorkoutLogger workout={current} unit="kg" error={false} finishing={finishing} onChange={() => {}} onRemove={() => {}} onFinish={() => {}} onAddExercise={add} focus={null} onFocusHandled={() => {}} />;
  const view = await render(logger({ ...workout, exercises: [] }), { wrapper: Root });

  expect(screen.getByRole('header', { name: 'No exercises yet' })).toBeTruthy();
  expect(screen.getByText('Add one to start logging sets.')).toBeTruthy();
  expect(screen.getAllByRole('button', { name: 'Add exercise' })).toHaveLength(1);
  await fireEvent.press(screen.getByRole('button', { name: 'Add exercise' }));
  expect(add).toHaveBeenCalledTimes(1);

  await view.rerender(logger({ ...workout, exercises: [] }, true));
  add.mockClear();
  await fireEvent.press(screen.getByRole('button', { name: 'Add exercise' }));
  expect(add).not.toHaveBeenCalled();

  await view.rerender(logger(workout));
  expect(screen.queryByText('No exercises yet')).toBeNull();
  expect(screen.getAllByRole('button', { name: 'Add exercise' })).toHaveLength(1);
});
