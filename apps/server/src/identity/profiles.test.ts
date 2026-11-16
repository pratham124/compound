import assert from 'node:assert/strict';
import { test } from 'node:test';

import { UserId } from '@compound/contracts';

import { createProfileStore, withUser } from './profileStore.ts';
import { cookieHeader, signInByEmail, startIdentity } from './testkit.ts';

type Identity = Awaited<ReturnType<typeof startIdentity>>;

async function signedInPerson(identity: Identity) {
  const { response } = await signInByEmail(identity.client, identity.sentCodes);
  const headers = { cookie: cookieHeader(response) };
  const me = await identity.client.inject({ method: 'GET', url: '/me', headers });

  return { headers, userId: UserId.parse(me.json<{ id: string }>().id) };
}

test('a new person gets a profile in the time zone their phone reports, in metric units', async (t) => {
  const identity = await startIdentity(t);
  const { headers } = await signedInPerson(identity);

  const response = await identity.client.inject({ method: 'GET', url: '/me/profile?timeZone=America/Toronto', headers });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { timeZone: 'America/Toronto', units: 'metric' });
});

test('a first request with no time zone stores UTC', async (t) => {
  const identity = await startIdentity(t);
  const { headers } = await signedInPerson(identity);

  const response = await identity.client.inject({ method: 'GET', url: '/me/profile', headers });

  assert.deepEqual(response.json(), { timeZone: 'UTC', units: 'metric' });
});

test('changing units sticks', async (t) => {
  const identity = await startIdentity(t);
  const { headers } = await signedInPerson(identity);

  await identity.client.inject({ method: 'GET', url: '/me/profile?timeZone=Asia/Tokyo', headers });

  const put = await identity.client.inject({ method: 'PUT', url: '/me/profile', headers, payload: { units: 'imperial' } });
  const get = await identity.client.inject({ method: 'GET', url: '/me/profile', headers });

  assert.equal(put.statusCode, 200);
  assert.deepEqual(get.json(), { timeZone: 'Asia/Tokyo', units: 'imperial' });
});

test('a time zone is stored under its canonical name, so a lowercase one is corrected', async (t) => {
  const identity = await startIdentity(t);
  const { headers } = await signedInPerson(identity);

  const response = await identity.client.inject({ method: 'GET', url: '/me/profile?timeZone=america/toronto', headers });

  assert.deepEqual(response.json(), { timeZone: 'America/Toronto', units: 'metric' });
});

test('a UTC offset is refused as a time zone, because Postgres would read +05:00 as five hours west', async (t) => {
  const identity = await startIdentity(t);
  const { headers } = await signedInPerson(identity);

  const response = await identity.client.inject({ method: 'GET', url: '/me/profile?timeZone=%2B05:00', headers });

  assert.equal(response.statusCode, 400);
});

test('changing units before the profile is ever loaded creates it in UTC', async (t) => {
  const identity = await startIdentity(t);
  const { headers } = await signedInPerson(identity);

  const put = await identity.client.inject({ method: 'PUT', url: '/me/profile', headers, payload: { units: 'imperial' } });

  assert.deepEqual(put.json(), { timeZone: 'UTC', units: 'imperial' });
});

test('the first request that brings a time zone replaces the UTC stand-in, and keeps the units', async (t) => {
  const identity = await startIdentity(t);
  const { headers } = await signedInPerson(identity);

  await identity.client.inject({ method: 'PUT', url: '/me/profile', headers, payload: { units: 'imperial' } });

  const first = await identity.client.inject({ method: 'GET', url: '/me/profile?timeZone=America/Toronto', headers });
  const later = await identity.client.inject({ method: 'GET', url: '/me/profile?timeZone=Europe/Paris', headers });

  assert.deepEqual(first.json(), { timeZone: 'America/Toronto', units: 'imperial' });
  assert.deepEqual(later.json(), { timeZone: 'America/Toronto', units: 'imperial' });
});

test('a request with no time zone leaves a stand-in that a later request with one replaces', async (t) => {
  const identity = await startIdentity(t);
  const { headers } = await signedInPerson(identity);

  await identity.client.inject({ method: 'GET', url: '/me/profile', headers });

  const later = await identity.client.inject({ method: 'GET', url: '/me/profile?timeZone=Asia/Tokyo', headers });

  assert.deepEqual(later.json(), { timeZone: 'Asia/Tokyo', units: 'metric' });
});

test('a time zone the phone reported is never replaced, even by UTC or another zone', async (t) => {
  const identity = await startIdentity(t);
  const { headers } = await signedInPerson(identity);

  await identity.client.inject({ method: 'GET', url: '/me/profile?timeZone=UTC', headers });

  const other = await identity.client.inject({ method: 'GET', url: '/me/profile?timeZone=Europe/Paris', headers });

  assert.deepEqual(other.json(), { timeZone: 'UTC', units: 'metric' });
});

test('profile routes refuse a request with no session', async (t) => {
  const { client } = await startIdentity(t);

  assert.equal((await client.inject({ method: 'GET', url: '/me/profile' })).statusCode, 401);
  assert.equal((await client.inject({ method: 'PUT', url: '/me/profile', payload: { units: 'imperial' } })).statusCode, 401);
});

test('a time zone that does not exist is refused', async (t) => {
  const identity = await startIdentity(t);
  const { headers } = await signedInPerson(identity);

  const response = await identity.client.inject({ method: 'GET', url: '/me/profile?timeZone=Mars/Olympus', headers });

  assert.equal(response.statusCode, 400);
});

test('two people cannot read or change each other\'s profile, even with the app-level user filter removed', async (t) => {
  const identity = await startIdentity(t);
  const ada = await signedInPerson(identity);
  const grace = await signedInPerson(identity);
  const { apiPool } = identity.connections;
  const profiles = createProfileStore(apiPool);

  await identity.client.inject({ method: 'GET', url: '/me/profile?timeZone=Asia/Tokyo', headers: ada.headers });
  await identity.client.inject({ method: 'GET', url: '/me/profile?timeZone=Europe/Paris', headers: grace.headers });

  const visibleToAda = await withUser(apiPool, ada.userId, (query) => query('select user_id, time_zone from user_profiles'));

  assert.deepEqual(visibleToAda.rows, [{ user_id: ada.userId, time_zone: 'Asia/Tokyo' }]);

  const updatedByAda = await withUser(apiPool, ada.userId, (query) => query("update user_profiles set units = 'imperial'"));

  assert.equal(updatedByAda.rowCount, 1);
  assert.equal((await profiles.getOrCreate(grace.userId, undefined)).units, 'metric');
  assert.equal((await profiles.getOrCreate(ada.userId, undefined)).units, 'imperial');

  await assert.rejects(
    withUser(apiPool, ada.userId, (query) =>
      query("insert into user_profiles (user_id, time_zone, units) values ($1, 'UTC', 'metric')", [crypto.randomUUID()]),
    ),
    /row-level security/,
  );
});

test('a query that never says who is asking sees no profiles', async (t) => {
  const identity = await startIdentity(t);

  await signedInPerson(identity).then(({ headers }) => identity.client.inject({ method: 'GET', url: '/me/profile', headers }));

  const client = await identity.connections.apiPool.connect();

  try {
    await client.query('begin; set local role compound_api');

    const rows = await client.query('select * from user_profiles');

    assert.equal(rows.rowCount, 0);
  } finally {
    await client.query('rollback');
    client.release();
  }
});
