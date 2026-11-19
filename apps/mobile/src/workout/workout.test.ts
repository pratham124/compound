import { weightInUnit, WorkoutSet } from './workout.ts';

it('displays 10 kg as 22.05 lb without changing the recorded metric weight', () => {
  const set = WorkoutSet.parse({ id: '00000000-0000-4000-8000-000000000001', reps: '8', weight: '10', unit: 'kg', done: true });

  expect(weightInUnit(set, 'lb')).toBe('22.05');
  expect(set.weight).toBe('10');
  expect(set.unit).toBe('kg');
});

it('displays 22 lb as 9.98 kg without changing the recorded imperial weight', () => {
  const set = WorkoutSet.parse({ id: '00000000-0000-4000-8000-000000000001', reps: '8', weight: '22', unit: 'lb', done: true });

  expect(weightInUnit(set, 'kg')).toBe('9.98');
  expect(set.weight).toBe('22');
  expect(set.unit).toBe('lb');
});
