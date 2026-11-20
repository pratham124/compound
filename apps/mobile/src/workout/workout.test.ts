import { shownWeight, validSet, WorkoutSet } from './workout.ts';

function set(weight: string, unit: 'kg' | 'lb') {
  return WorkoutSet.parse({ id: '00000000-0000-4000-8000-000000000001', reps: '8', weight, unit, done: true });
}

it('displays 10 kg as 22 lb, to the nearest half, without changing the recorded metric weight', () => {
  const metric = set('10', 'kg');

  expect(shownWeight(metric, 'lb')).toEqual({ weight: '22', unit: 'lb' });
  expect(metric.weight).toBe('10');
  expect(metric.unit).toBe('kg');
});

it('displays 22 lb as 10 kg, to the nearest half, without changing the recorded imperial weight', () => {
  const imperial = set('22', 'lb');

  expect(shownWeight(imperial, 'kg')).toEqual({ weight: '10', unit: 'kg' });
  expect(imperial.weight).toBe('22');
  expect(imperial.unit).toBe('lb');
});

it('rounds converted weights to whole or half numbers only', () => {
  expect(shownWeight(set('60', 'kg'), 'lb').weight).toBe('132.5');
  expect(shownWeight(set('135', 'lb'), 'kg').weight).toBe('61');
  expect(shownWeight(set('45', 'lb'), 'kg').weight).toBe('20.5');
  expect(shownWeight(set('22.5', 'kg'), 'kg').weight).toBe('22.5');
});

it.each(['22.', '1e2', '0x10'])('keeps the weight %j that is not a valid number in the unit it was typed in', (weight) => {
  expect(shownWeight(set(weight, 'lb'), 'kg')).toEqual({ weight, unit: 'lb' });
});

describe('validSet', () => {
  const setWith = (reps: string, weight: string) => WorkoutSet.parse({ id: '00000000-0000-4000-8000-00000000000a', reps, weight, unit: 'kg', done: false });

  it.each([
    ['8', '', true],
    ['8', '   ', true],
    ['8', '12,5', true],
    ['8', '12.5', true],
    ['8', '12.', false],
    ['8', '99999', true],
    ['8', '100000', false],
    ['0', '', false],
    ['1000', '', false],
    ['999', '', true],
    ['', '', false],
  ])('reps %j with weight %j is %s', (reps, weight, expected) => {
    expect(validSet(setWith(reps, weight))).toBe(expected);
  });
});
