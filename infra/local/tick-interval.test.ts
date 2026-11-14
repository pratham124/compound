import assert from 'node:assert/strict';
import { test } from 'node:test';

import { parseIntervalSeconds } from './tick-interval.ts';

test('the ticker interval defaults to 10 seconds when unset', () => {
  assert.equal(parseIntervalSeconds(undefined), 10);
});

test('the ticker interval accepts a whole number of seconds', () => {
  assert.equal(parseIntervalSeconds('1'), 1);
});

for (const bad of ['0', '-5', '', '1.5', '10s']) {
  test(`the ticker refuses to start with TICK_INTERVAL_SECONDS="${bad}"`, () => {
    assert.throws(() => parseIntervalSeconds(bad), /TICK_INTERVAL_SECONDS/);
  });
}
