import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { createGestureController } from 'react-native-gesture-handler/jest-utils';

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

it('ticks the visible clock once a second', async () => {
  jest.useFakeTimers({ now: 1_000_000 });

  try {
    await render(<WorkoutLogger workout={{ ...workout, startedAt: 999_000 }} unit="kg" error={false} finishing={false} onEdit={() => {}} onRemove={() => {}} onRetry={() => {}} onFinish={() => {}} onAddExercise={() => {}} focus={null} onFocusHandled={() => {}} />, { wrapper: Root });
    expect(screen.getByTestId('workout-clock')).toHaveTextContent('0:01');
    await act(async () => { jest.advanceTimersByTime(1000); });
    expect(screen.getByTestId('workout-clock')).toHaveTextContent('0:02');
  } finally {
    jest.useRealTimers();
  }
});

it('logs a weightless set and exposes editable numeric fields and finish', async () => {
  const edit = jest.fn();
  const finish = jest.fn();
  const target = { exerciseId: workout.exercises[0]?.id, setId: workout.exercises[0]?.sets[0]?.id };

  await render(<WorkoutLogger workout={workout} unit="lb" error={false} finishing={false} onEdit={edit} onRemove={() => {}} onRetry={() => {}} onFinish={finish} onAddExercise={() => {}} focus={null} onFocusHandled={() => {}} />, { wrapper: Root });
  await fireEvent.changeText(screen.getByLabelText('Set 1 weight in lb'), '22.5');
  expect(edit).toHaveBeenNthCalledWith(1, { kind: 'weight', target, weight: '22.5', unit: 'lb' });
  await fireEvent.press(screen.getByRole('checkbox', { name: 'Set 1 done' }));
  expect(edit).toHaveBeenNthCalledWith(2, { kind: 'done', target, done: true });
  await fireEvent.press(screen.getByRole('button', { name: 'Finish' }));
  expect(finish).toHaveBeenCalledTimes(1);
});

it('removes a set through its delete accessibility action, and not while finishing', async () => {
  const remove = jest.fn();
  const logger = (finishing: boolean) => <WorkoutLogger workout={workout} unit="kg" error={false} finishing={finishing} onEdit={() => {}} onRemove={remove} onRetry={() => {}} onFinish={() => {}} onAddExercise={() => {}} focus={null} onFocusHandled={() => {}} />;
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

function measuredRow(element: ReturnType<typeof screen.getByLabelText>) {
  let node = element.parent;

  while (node !== null && node.props.onLayout === undefined) {
    node = node.parent;
  }

  if (node === null) {
    throw new Error('The set row does not measure its width');
  }

  return node;
}

describe('swiping a set left', () => {
  const removal = { kind: 'set', exerciseId: workout.exercises[0]?.id, setId: workout.exercises[0]?.sets[0]?.id };

  async function swipeRow() {
    const remove = jest.fn();

    await render(<WorkoutLogger workout={workout} unit="kg" error={false} finishing={false} onEdit={() => {}} onRemove={remove} onRetry={() => {}} onFinish={() => {}} onAddExercise={() => {}} focus={null} onFocusHandled={() => {}} />, { wrapper: Root });
    await fireEvent(measuredRow(screen.getByLabelText('Set 1')), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 300, height: 52 } } });
    const pan = createGestureController(`swipe-${workout.exercises[0]?.sets[0]?.id}`);

    pan.begin();
    pan.activate({ translationX: -30 });

    return { remove, pan };
  }

  it('deletes the set when let go past half the row width', async () => {
    const { remove, pan } = await swipeRow();

    pan.update({ translationX: -160 });
    pan.end({ translationX: -160 });
    await waitFor(() => expect(remove).toHaveBeenCalledWith(removal));
  });

  it.each([
    ['let go before half the row width', [-140]],
    ['dragged past half and back before letting go', [-200, -140]],
  ])('keeps the set when %s', async (_case, path) => {
    const { remove, pan } = await swipeRow();

    for (const translationX of path) {
      pan.update({ translationX });
    }

    pan.end({ translationX: path.at(-1) });
    await act(async () => { await new Promise(setImmediate); });
    expect(remove).not.toHaveBeenCalled();
  });

  it('keeps the set when the swipe is cancelled past half the row width', async () => {
    const { remove, pan } = await swipeRow();

    pan.update({ translationX: -200 });
    pan.cancel({ translationX: -200 });
    await act(async () => { await new Promise(setImmediate); });
    expect(remove).not.toHaveBeenCalled();
  });
});

it('keeps a half-typed weight in the unit it was typed in after the display unit changes', async () => {
  const edit = jest.fn();
  const halfTyped = Workout.parse({ ...workout, exercises: [{ ...workout.exercises[0], sets: [{ ...workout.exercises[0]?.sets[0], weight: '22.', unit: 'lb' }] }] });

  await render(<WorkoutLogger workout={halfTyped} unit="kg" error={false} finishing={false} onEdit={edit} onRemove={() => {}} onRetry={() => {}} onFinish={() => {}} onAddExercise={() => {}} focus={null} onFocusHandled={() => {}} />, { wrapper: Root });
  const weight = screen.getByLabelText('Set 1 weight in lb');

  expect(weight.props.value).toBe('22.');
  expect(screen.getByRole('checkbox', { name: 'Set 1 done' })).toBeDisabled();
  await fireEvent.changeText(weight, '22.5');
  expect(edit).toHaveBeenCalledWith(expect.objectContaining({ kind: 'weight', weight: '22.5', unit: 'lb' }));
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

  const logger = (current: Workout) => <WorkoutLogger workout={current} unit="kg" error={false} finishing={false} onEdit={() => {}} onRemove={() => {}} onRetry={() => {}} onFinish={() => {}} onAddExercise={() => {}} focus={null} onFocusHandled={() => {}} />;
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
  const logger = (current: Workout, finishing = false) => <WorkoutLogger workout={current} unit="kg" error={false} finishing={finishing} onEdit={() => {}} onRemove={() => {}} onRetry={() => {}} onFinish={() => {}} onAddExercise={add} focus={null} onFocusHandled={() => {}} />;
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
