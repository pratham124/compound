import assert from 'node:assert/strict';
import { test } from 'node:test';

import { uuidv7 } from './uuidv7.ts';

test('a UUIDv7 carries the millisecond timestamp first, then version 7 and the RFC variant bits', () => {
  const id = uuidv7(0x0123456789ab);

  assert.match(id, /^01234567-89ab-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});
