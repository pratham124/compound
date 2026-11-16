import assert from 'node:assert/strict';
import { test } from 'node:test';

import { cookieHeader, sessionTokenOf, signInByEmail, startIdentity } from './testkit.ts';
import { KEY_PREFIX } from './valkeyStorage.ts';

test('the session token reveals nothing about the person and is kept in Valkey', async (t) => {
  const { client, connections, sentCodes } = await startIdentity(t);
  const { email, response } = await signInByEmail(client, sentCodes);
  const token = sessionTokenOf(response);
  const stored = await connections.valkey.get(KEY_PREFIX + token);

  assert.match(token, /^[A-Za-z0-9]{20,}$/);
  assert.ok(!token.includes(email));
  assert.ok(stored !== null && stored.includes(email), 'the session record, with the person, is in Valkey under the token');
});

test('every request looks the session up in Valkey, so removing it there ends the session at once', async (t) => {
  const { client, connections, sentCodes } = await startIdentity(t);
  const { response } = await signInByEmail(client, sentCodes);
  const headers = { cookie: cookieHeader(response) };

  assert.equal((await client.inject({ method: 'GET', url: '/me', headers })).statusCode, 200);

  await connections.valkey.del(KEY_PREFIX + sessionTokenOf(response));

  assert.equal((await client.inject({ method: 'GET', url: '/me', headers })).statusCode, 401);
});

test('signing out ends the session at once, and the old token is refused afterwards', async (t) => {
  const { client, connections, sentCodes } = await startIdentity(t);
  const { response } = await signInByEmail(client, sentCodes);
  const headers = { cookie: cookieHeader(response) };

  const signOut = await client.inject({
    method: 'POST',
    url: '/api/auth/sign-out',
    headers: { ...headers, 'expo-origin': 'compound://' },
    payload: {},
  });

  assert.equal(signOut.statusCode, 200);
  assert.equal(await connections.valkey.get(KEY_PREFIX + sessionTokenOf(response)), null);
  assert.equal((await client.inject({ method: 'GET', url: '/me', headers })).statusCode, 401);
});
