import { Workout } from './workout.ts';
import { workoutBody } from './workoutSyncKind.ts';

const ids = {
  workout: '01930000-0000-7000-8000-000000000001',
  squat: '01930000-0000-7000-8000-000000000002',
  pushups: '01930000-0000-7000-8000-000000000003',
  ticked: '01930000-0000-7000-8000-000000000004',
  cleared: '01930000-0000-7000-8000-000000000005',
  unticked: '01930000-0000-7000-8000-000000000006',
};

it('uploads every exercise but only the sets that are ticked and still valid', () => {
  const workout = Workout.parse({
    id: ids.workout, startedAt: 0, finishedAt: 60_000,
    exercises: [
      { id: ids.squat, exerciseId: 'Barbell_Squat', sets: [
        { id: ids.ticked, reps: '5', weight: '60', unit: 'lb', done: true },
        // Ticked, then its reps were cleared: there's nothing to store.
        { id: ids.cleared, reps: '', weight: '60', unit: 'lb', done: true },
      ] },
      { id: ids.pushups, exerciseId: 'Pushups', sets: [{ id: ids.unticked, reps: '10', weight: '', unit: 'kg', done: false }] },
    ],
  });

  expect(workoutBody({ ...workout, finishedAt: 60_000 }).data).toEqual({
    startedAt: 0,
    finishedAt: 60_000,
    exercises: [
      { id: ids.squat, exerciseId: 'Barbell_Squat', sets: [{ id: ids.ticked, reps: 5, weight: 60, unit: 'lb' }] },
      { id: ids.pushups, exerciseId: 'Pushups', sets: [] },
    ],
  });
});
