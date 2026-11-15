import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';

import { cookieHeader, fakeApple, startIdentity, uniqueEmail } from './testkit.ts';

test('Sign in with Apple creates a person and a session that identifies them', async (t) => {
  const { client, config, connections } = await startIdentity(t);
  const apple = await fakeApple(t, config.appleBundleId);
  const email = uniqueEmail();

  const signIn = await client.inject({
    method: 'POST',
    url: '/api/auth/sign-in/social',
    payload: { provider: 'apple', idToken: { token: await apple.idToken({ sub: randomUUID(), email }) } },
  });

  assert.equal(signIn.statusCode, 200);

  const people = await connections.pool.query('select id from users where email = $1', [email]);

  assert.equal(people.rowCount, 1);

  const me = await client.inject({ method: 'GET', url: '/me', headers: { cookie: cookieHeader(signIn) } });

  assert.equal(me.statusCode, 200);
  assert.deepEqual(me.json(), { id: people.rows[0].id, name: '', email });
});

test('an emailed code signs in a new person and identifies them like Apple does', async (t) => {
  const { client, connections, sentCodes } = await startIdentity(t);
  const email = uniqueEmail();

  const requested = await client.inject({
    method: 'POST',
    url: '/api/auth/email-otp/send-verification-otp',
    payload: { email, type: 'sign-in' },
  });

  assert.equal(requested.statusCode, 200);
  assert.equal(sentCodes.length, 1);
  assert.equal(sentCodes[0]?.email, email);

  const signIn = await client.inject({
    method: 'POST',
    url: '/api/auth/sign-in/email-otp',
    payload: { email, otp: sentCodes[0]?.code },
  });

  assert.equal(signIn.statusCode, 200);

  const people = await connections.pool.query('select id from users where email = $1', [email]);
  const me = await client.inject({ method: 'GET', url: '/me', headers: { cookie: cookieHeader(signIn) } });

  assert.equal(me.statusCode, 200);
  assert.deepEqual(me.json(), { id: people.rows[0].id, name: '', email });
});

// PRD section 11: an emailed code works for 5 minutes.
test('a code is refused once five minutes have passed', async (t) => {
  const { client, sentCodes } = await startIdentity(t);
  const email = uniqueEmail();

  await client.inject({
    method: 'POST',
    url: '/api/auth/email-otp/send-verification-otp',
    payload: { email, type: 'sign-in' },
  });

  t.mock.timers.enable({ apis: ['Date'], now: Date.now() });
  t.mock.timers.tick((5 * 60 + 1) * 1000);

  const signIn = await client.inject({
    method: 'POST',
    url: '/api/auth/sign-in/email-otp',
    payload: { email, otp: sentCodes[0]?.code },
  });

  assert.equal(signIn.statusCode, 400);
  assert.equal(signIn.json().code, 'OTP_EXPIRED');
});

test('a code still works one second before five minutes have passed', async (t) => {
  const { client, sentCodes } = await startIdentity(t);
  const email = uniqueEmail();

  await client.inject({
    method: 'POST',
    url: '/api/auth/email-otp/send-verification-otp',
    payload: { email, type: 'sign-in' },
  });

  t.mock.timers.enable({ apis: ['Date'], now: Date.now() });
  t.mock.timers.tick((5 * 60 - 1) * 1000);

  const signIn = await client.inject({
    method: 'POST',
    url: '/api/auth/sign-in/email-otp',
    payload: { email, otp: sentCodes[0]?.code },
  });

  assert.equal(signIn.statusCode, 200);
});

test('a code that already signed someone in is refused the second time', async (t) => {
  const { client, sentCodes } = await startIdentity(t);
  const email = uniqueEmail();

  await client.inject({
    method: 'POST',
    url: '/api/auth/email-otp/send-verification-otp',
    payload: { email, type: 'sign-in' },
  });

  const attempt = () =>
    client.inject({ method: 'POST', url: '/api/auth/sign-in/email-otp', payload: { email, otp: sentCodes[0]?.code } });

  assert.equal((await attempt()).statusCode, 200);
  assert.equal((await attempt()).statusCode, 400);
});

test('Sign in with Apple keeps the name the phone passes along from the first authorization', async (t) => {
  const { client, config } = await startIdentity(t);
  const apple = await fakeApple(t, config.appleBundleId);

  const signIn = await client.inject({
    method: 'POST',
    url: '/api/auth/sign-in/social',
    payload: {
      provider: 'apple',
      idToken: {
        token: await apple.idToken({ sub: randomUUID(), email: uniqueEmail() }),
        user: { name: { firstName: 'Ada', lastName: 'Lovelace' } },
      },
    },
  });

  const me = await client.inject({ method: 'GET', url: '/me', headers: { cookie: cookieHeader(signIn) } });

  assert.equal(me.json().name, 'Ada Lovelace');
});
