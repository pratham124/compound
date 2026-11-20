import { UserId } from '@compound/contracts';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { ActionSheetIOS, Alert, Platform, Pressable, Text } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { migrateLocalDatabase } from '../localDatabase/migrations.ts';
import { AccountWorkouts, useWorkouts } from './WorkoutProvider.tsx';
import { WorkoutStoreContext } from './WorkoutStoreContext.ts';
import { WorkoutLogger } from './WorkoutLogger.tsx';
import { Workout, WorkoutExerciseId, WorkoutSetId } from './workout.ts';
import { removeWorkoutItem } from './workoutRemoval.ts';
import { createWorkoutStore } from './workoutStore.ts';
import { openTestDatabase } from './workoutTestDatabase.ts';

const person = UserId.parse('00000000-0000-4000-8000-000000000001');

const draft = Workout.parse({ id: '00000000-0000-4000-8000-000000000002', startedAt: 1000, finishedAt: null, exercises: [
  { id: '00000000-0000-4000-8000-000000000003', exerciseId: 'Pushups', sets: [
    { id: '00000000-0000-4000-8000-000000000004', reps: '8', weight: '', unit: 'kg', done: true },
    { id: '00000000-0000-4000-8000-000000000005', reps: '5', weight: '20', unit: 'kg', done: false },
    { id: '00000000-0000-4000-8000-000000000006', reps: '6', weight: '12.', unit: 'kg', done: false },
  ] },
  { id: '00000000-0000-4000-8000-000000000007', exerciseId: 'Pushups', sets: [
    { id: '00000000-0000-4000-8000-000000000008', reps: '10', weight: '', unit: 'kg', done: false },
  ] },
] });

function Driver() {
  const workouts = useWorkouts();

  if (workouts.state.kind !== 'ready' || workouts.state.active === null) {
    return <Text>No active workout</Text>;
  }

  return <GestureHandlerRootView>
    <WorkoutLogger workout={workouts.state.active} unit={workouts.state.unit} error={workouts.error} finishing={false} onEdit={workouts.edit} onRemove={workouts.remove} onRetry={workouts.retry} onFinish={() => void workouts.finish()} onAddExercise={() => {}} focus={null} onFocusHandled={() => {}} />
    <Pressable accessibilityRole="button" accessibilityLabel="Reload persisted workout" onPress={workouts.reload}><Text>Reload persisted workout</Text></Pressable>
  </GestureHandlerRootView>;
}

function nativeMenus() {
  const sheets: { options: Parameters<typeof ActionSheetIOS.showActionSheetWithOptions>[0]; select: (index: number) => void }[] = [];

  jest.spyOn(ActionSheetIOS, 'showActionSheetWithOptions').mockImplementation((options, select) => { sheets.push({ options, select }); });
  jest.spyOn(Alert, 'alert').mockImplementation(() => { throw new Error('iOS removal is confirmed by the action sheet, not an alert'); });

  function latestSheet() {
    const sheet = sheets.at(-1);

    if (sheet === undefined) {
      throw new Error('Native action sheet did not open');
    }

    return sheet;
  }

  return { latestSheet };
}

function firstPushupsButton(name: string) {
  const button = screen.getAllByRole('button', { name })[0];

  if (button === undefined) {
    throw new Error(`${name} is missing`);
  }

  return button;
}

function deleteSet(label: string) {
  const setNumber = screen.getAllByLabelText(label)[0];

  if (setNumber === undefined) {
    throw new Error(`${label} is missing`);
  }

  fireEvent(setNumber, 'accessibilityAction', { nativeEvent: { actionName: 'delete' } });
}

it('removes sets by stable ID, keeps an edit that lands in the same render as a removal, keeps duplicate exercise instances, and reloads them all', async () => {
  const { db, native } = openTestDatabase();
  const menus = nativeMenus();

  try {
    await migrateLocalDatabase(db);
    const store = createWorkoutStore(db, person);
    let reads = 0;

    await store.save(draft);

    const open = async () => ({ ...store, active: async () => {
      reads++;

      return store.active();
    } });

    const app = await render(<WorkoutStoreContext value={open}><AccountWorkouts userId={person}><Driver /></AccountWorkouts></WorkoutStoreContext>);

    async function reload() {
      const before = reads;

      await fireEvent.press(screen.getByRole('button', { name: 'Reload persisted workout' }));
      await waitFor(() => expect(reads).toBe(before + 1));
    }

    await screen.findAllByRole('button', { name: 'More for Pushups' });
    await fireEvent.press(firstPushupsButton('More for Pushups'));
    expect(menus.latestSheet().options).toMatchObject({ title: 'Pushups', options: ['Remove exercise', 'Cancel'], destructiveButtonIndex: 0, cancelButtonIndex: 1 });
    await act(async () => { menus.latestSheet().select(1); });
    expect(await store.active()).toEqual(draft);

    const setTwoWeight = screen.getByLabelText('Set 2 weight in kg');

    await act(async () => {
      deleteSet('Set 3');
      setTwoWeight.props.onChangeText('17.5');
    });
    await screen.findByLabelText('1 of 3 sets done');
    await reload();
    expect(screen.queryByLabelText('Set 3 reps')).toBeNull();
    expect(screen.getByLabelText('Set 2 weight in kg').props.value).toBe('17.5');

    await act(async () => { deleteSet('Set 1'); });
    await act(async () => { deleteSet('Set 1'); });
    await screen.findByLabelText('0 of 1 sets done');
    expect((await store.active())?.exercises[0]?.sets).toEqual([]);

    await fireEvent.press(firstPushupsButton('Add set to Pushups'));
    await screen.findByLabelText('0 of 2 sets done');
    await fireEvent.press(firstPushupsButton('More for Pushups'));
    await act(async () => { menus.latestSheet().select(0); });
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'More for Pushups' })).toHaveLength(1));
    await reload();
    expect(screen.getAllByRole('button', { name: 'More for Pushups' })).toHaveLength(1);
    expect(screen.getByLabelText('Set 1 reps').props.value).toBe('10');
    expect((await store.active())?.exercises).toEqual(draft.exercises.slice(1));
    await app.unmount();
  } finally {
    native.close();
    jest.restoreAllMocks();
  }
});

it('confirms exercise removal with a single alert on Android', async () => {
  const { db, native } = openTestDatabase();
  const originalOs = Platform.OS;
  const alerts: { title: string | null | undefined; message: string | null | undefined; buttons: NonNullable<Parameters<typeof Alert.alert>[2]> }[] = [];

  jest.spyOn(Alert, 'alert').mockImplementation((title, message, buttons) => { alerts.push({ title, message, buttons: buttons ?? [] }); });

  try {
    Platform.OS = 'android';
    await migrateLocalDatabase(db);
    const store = createWorkoutStore(db, person);

    await store.save(draft);
    const open = async () => store;
    const app = await render(<WorkoutStoreContext value={open}><AccountWorkouts userId={person}><Driver /></AccountWorkouts></WorkoutStoreContext>);

    await screen.findAllByRole('button', { name: 'More for Pushups' });
    await fireEvent.press(firstPushupsButton('More for Pushups'));
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({ title: 'Remove Pushups?', message: 'Its sets will be removed from this workout.' });
    expect(alerts[0]?.buttons.map((button) => [button.text, button.style])).toEqual([['Cancel', 'cancel'], ['Remove exercise', 'destructive']]);
    await act(async () => { alerts[0]?.buttons[1]?.onPress?.(); });
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'More for Pushups' })).toHaveLength(1));
    expect((await store.active())?.exercises).toEqual(draft.exercises.slice(1));
    await app.unmount();
  } finally {
    Platform.OS = originalOs;
    native.close();
    jest.restoreAllMocks();
  }
});

it('ignores a native removal callback after the workout has finished', async () => {
  const { db, native } = openTestDatabase();
  const menus = nativeMenus();

  try {
    await migrateLocalDatabase(db);
    const store = createWorkoutStore(db, person);

    await store.save(draft);
    const open = async () => store;
    const app = await render(<WorkoutStoreContext value={open}><AccountWorkouts userId={person}><Driver /></AccountWorkouts></WorkoutStoreContext>);

    await screen.findAllByRole('button', { name: 'More for Pushups' });
    await fireEvent.press(firstPushupsButton('More for Pushups'));
    const exerciseMenu = menus.latestSheet();

    await fireEvent.press(screen.getByRole('button', { name: 'Finish' }));
    await screen.findByText('No active workout');
    await act(async () => { exerciseMenu.select(0); });
    expect(await store.active()).toBeNull();
    expect((await store.byId(draft.id))?.exercises).toEqual(draft.exercises);
    await app.unmount();
  } finally {
    native.close();
    jest.restoreAllMocks();
  }
});

describe('removeWorkoutItem', () => {
  const [first, second] = draft.exercises;

  if (first === undefined || second === undefined) {
    throw new Error('Fixture needs two exercises');
  }

  const firstSet = first.sets[0];

  if (firstSet === undefined) {
    throw new Error('Fixture needs a set');
  }

  it('returns the workout without the exercise or the set', () => {
    expect(removeWorkoutItem(draft, { kind: 'exercise', exerciseId: first.id })?.exercises).toEqual([second]);
    expect(removeWorkoutItem(draft, { kind: 'set', exerciseId: first.id, setId: firstSet.id })?.exercises[0]?.sets).toHaveLength(2);
  });

  it('returns null when the exercise or the set is unknown', () => {
    const unknown = WorkoutExerciseId.parse('00000000-0000-4000-8000-0000000000ff');

    expect(removeWorkoutItem(draft, { kind: 'exercise', exerciseId: unknown })).toBeNull();
    expect(removeWorkoutItem(draft, { kind: 'set', exerciseId: first.id, setId: WorkoutSetId.parse('00000000-0000-4000-8000-0000000000ff') })).toBeNull();
  });
});
