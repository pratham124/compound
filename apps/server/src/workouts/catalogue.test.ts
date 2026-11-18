import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { exercises, findExercise } from './catalogue.ts';

test('the workouts catalogue preserves every field and id from the shared catalogue', () => {
  const shared = readFileSync(new URL(import.meta.resolve('@compound/exercise-catalogue/catalogue.json')), 'utf8');

  assert.ok(exercises.length > 800);
  assert.deepEqual(exercises, JSON.parse(shared));
  assert.equal(new Set(exercises.map(({ id }) => id)).size, exercises.length);
});

test('workouts can resolve an existing exercise id and refuse an unknown one', () => {
  assert.equal(findExercise('Incline_Dumbbell_Press')?.name, 'Incline Dumbbell Press');
  assert.equal(findExercise('missing-exercise'), undefined);
});
