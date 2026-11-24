import assert from 'node:assert/strict';
import { test } from 'node:test';

import { z } from 'zod';

import { SYNC_KINDS } from '../app.ts';
import { startIdentity } from '../identity/testkit.ts';
import { uuidv7 } from '../identity/uuidv7.ts';
import { signedInPerson, upload } from '../workouts/testkit.ts';
import { defineSyncKind } from './kinds.ts';

// A second kind that exists only here. All it describes is its body and where a winning body goes; replays, older
// edits and sessions are handled by the sync module, untouched.
function noteKind() {
  const stored = new Map<string, string>();

  const kind = defineSyncKind({
    kind: 'note',
    body: z.object({ text: z.string() }),
    write: async (_query, { userId, itemId, body }) => {
      stored.set(`${userId}/${itemId}`, body.text);
    },
  });

  return { kind, stored };
}

function noteChange(itemId: string, text: string, changedAt: number) {
  return { key: uuidv7(changedAt), kind: 'note', itemId, changedAt, body: { text } };
}

test('a second kind syncs through the same upload, idempotency and last-write-wins, by describing only its body and write', async (t) => {
  const notes = noteKind();
  const identity = await startIdentity(t, { syncKinds: [...SYNC_KINDS, notes.kind] });
  const person = await signedInPerson(identity);
  const noteId = uuidv7();
  const first = noteChange(noteId, 'Squat felt heavy', 1000);
  const older = noteChange(noteId, 'An older edit from the tablet', 500);
  const newer = noteChange(noteId, 'Squat felt fine after all', 2000);

  const seen = [];

  for (const batch of [[first], [first], [older], [newer]]) {
    const response = await upload(identity, person.headers, batch);

    seen.push([response.json<{ results: { outcome: string }[] }>().results[0]?.outcome, notes.stored.get(`${person.userId}/${noteId}`)]);
  }

  assert.deepEqual(seen, [
    ['applied', 'Squat felt heavy'],
    ['stale', 'Squat felt heavy'],
    ['stale', 'Squat felt heavy'],
    ['applied', 'Squat felt fine after all'],
  ]);
  assert.equal((await upload(identity, { cookie: '' }, [noteChange(uuidv7(), 'no session', 3000)])).statusCode, 401);
});

