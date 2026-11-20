import { Workout, WorkoutSetId } from './workout.ts';
import { addEmptySet, totalSets, upNextSet } from './workoutProgress.ts';

const SET_A = '00000000-0000-4000-8000-00000000000a';
const SET_B = '00000000-0000-4000-8000-00000000000b';
const SET_C = '00000000-0000-4000-8000-00000000000c';

function workoutWith(sets: [string, boolean][][]) {
  return Workout.parse({
    id: '00000000-0000-4000-8000-000000000001',
    startedAt: 0,
    finishedAt: null,
    exercises: sets.map((exerciseSets, index) => ({
      id: `00000000-0000-4000-8000-00000000010${index}`,
      exerciseId: 'bench-press',
      sets: exerciseSets.map(([id, done]) => ({ id, reps: '5', weight: '20', unit: 'kg', done })),
    })),
  });
}

describe('upNextSet', () => {
  it('is the first set not yet done, across exercises', () => {
    const workout = workoutWith([[[SET_A, true]], [[SET_B, false], [SET_C, false]]]);

    expect(upNextSet(workout)).toBe(SET_B);
  });

  it('is null when every set is done or there are none', () => {
    expect(upNextSet(workoutWith([[[SET_A, true]]]))).toBeNull();
    expect(upNextSet(workoutWith([]))).toBeNull();
  });
});

describe('totalSets', () => {
  it('counts sets across exercises', () => {
    expect(totalSets(workoutWith([[[SET_A, true]], [[SET_B, false], [SET_C, false]]]))).toBe(3);
  });
});

describe('addEmptySet', () => {
  it('appends a blank, not-done set in the given unit with the given id, leaving the rest alone', () => {
    const [exercise] = workoutWith([[[SET_A, true]]]).exercises;
    const added = addEmptySet(exercise!, 'lb', WorkoutSetId.parse(SET_B));

    expect(added.sets).toEqual([
      exercise!.sets[0],
      { id: SET_B, reps: '', weight: '', unit: 'lb', done: false },
    ]);
    expect(exercise!.sets).toHaveLength(1);
  });
});
