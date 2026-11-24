import { Exercise, SYNC_KIND_WORKOUT, UserId, type WorkoutBody } from '@compound/contracts';

import { uuidv7 } from '../identity/uuidv7.ts';
import { cookieHeader, signInByEmail, type startIdentity } from '../identity/testkit.ts';

type Identity = Awaited<ReturnType<typeof startIdentity>>;

export async function signedInPerson(identity: Identity) {
  const { response } = await signInByEmail(identity.client, identity.sentCodes);
  const headers = { cookie: cookieHeader(response) };
  const me = await identity.client.inject({ method: 'GET', url: '/me', headers });

  return { headers, userId: UserId.parse(me.json<{ id: string }>().id) };
}

/** A finished workout of one exercise with the given sets. */
export function finishedWorkout(sets: { reps: number; weight: number | null }[] = [{ reps: 5, weight: 100 }]): WorkoutBody {
  return {
    startedAt: Date.UTC(2026, 10, 20, 17, 0),
    finishedAt: Date.UTC(2026, 10, 20, 18, 0),
    exercises: [{ id: uuidv7(), exerciseId: Exercise.shape.id.parse('Barbell_Squat'), sets: sets.map((set) => ({ id: uuidv7(), unit: 'kg', ...set })) }],
  };
}

export type Change = { key: string; kind: string; itemId: string; changedAt: number; body: unknown };

export type WorkoutChange = Change & { body: WorkoutBody };

export function workoutChange(itemId: string, body: WorkoutBody, changedAt = body.finishedAt): WorkoutChange {
  return { key: uuidv7(changedAt), kind: SYNC_KIND_WORKOUT, itemId, changedAt, body };
}

export function upload(identity: Identity, headers: { cookie: string }, changes: Change[]) {
  return identity.client.inject({ method: 'POST', url: '/sync/changes', headers, payload: { changes } });
}
