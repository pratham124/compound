import { Workout, WorkoutExerciseId, WorkoutSetId } from './workout.ts';
import { applyWorkoutEdit } from './workoutEdit.ts';

const target = { exerciseId: WorkoutExerciseId.parse('00000000-0000-4000-8000-000000000002'), setId: WorkoutSetId.parse('00000000-0000-4000-8000-000000000003') };

function workoutWithReps(reps: string) {
  return Workout.parse({
    id: '00000000-0000-4000-8000-000000000001', startedAt: 1000, finishedAt: null,
    exercises: [{ id: target.exerciseId, exerciseId: 'Pushups', sets: [{ id: target.setId, reps, weight: '', unit: 'kg', done: false }] }],
  });
}

it('ticks a set done against its latest reps, so a tick queued behind clearing the reps is dropped', () => {
  expect(applyWorkoutEdit(workoutWithReps(''), { kind: 'done', target, done: true })).toBeNull();
  expect(applyWorkoutEdit(workoutWithReps('8'), { kind: 'done', target, done: true })?.exercises[0]?.sets[0]?.done).toBe(true);
});

it('drops an edit to a set that has been removed', () => {
  const removed = Workout.parse({ ...workoutWithReps('8'), exercises: [{ id: target.exerciseId, exerciseId: 'Pushups', sets: [] }] });

  expect(applyWorkoutEdit(removed, { kind: 'reps', target, reps: '9' })).toBeNull();
});
