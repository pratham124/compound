import { Exercise } from '@compound/contracts';

import { catalogueIdsIn, pickExercise } from './pickExercise.ts';
import { Workout, WorkoutExerciseId, WorkoutSetId } from './workout.ts';

const pushups = Exercise.shape.id.parse('Pushups');
const chinUp = Exercise.shape.id.parse('Chin-Up');
const ids = { exercise: WorkoutExerciseId.parse('00000000-0000-4000-8000-000000000010'), set: WorkoutSetId.parse('00000000-0000-4000-8000-000000000011') };

const workout = Workout.parse({
  id: '00000000-0000-4000-8000-000000000003', startedAt: 1000, finishedAt: null,
  exercises: [
    { id: '00000000-0000-4000-8000-000000000004', exerciseId: 'Pushups', sets: [] },
    { id: '00000000-0000-4000-8000-000000000007', exerciseId: 'Pushups', sets: [] },
  ],
});

it('does not add a card for an exercise already in the workout, and points at its first card', () => {
  const picked = pickExercise(workout, pushups, 'kg', ids);

  expect(picked).toEqual({ kind: 'existing', focus: workout.exercises[0]?.id });
});

it('adds exactly one card with one empty set for a new exercise and points at it', () => {
  const picked = pickExercise(workout, chinUp, 'lb', ids);

  if (picked.kind !== 'added') {
    throw new Error(`Expected a new card, got ${picked.kind}`);
  }

  expect(picked.workout.exercises).toHaveLength(3);
  expect(picked.workout.exercises[2]).toEqual({ id: ids.exercise, exerciseId: chinUp, sets: [{ id: ids.set, reps: '', weight: '', unit: 'lb', done: false }] });
  expect(picked.focus).toBe(ids.exercise);
});

it('lists the catalogue ids on the workout cards', () => {
  expect([...catalogueIdsIn(workout)]).toEqual(['Pushups']);
});
