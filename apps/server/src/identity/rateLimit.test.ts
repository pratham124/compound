import assert from 'node:assert/strict';
import { test } from 'node:test';

import { startIdentity, uniqueEmail } from './testkit.ts';

test('the fourth code request from one client within a minute is refused with 429', async (t) => {
  const { client } = await startIdentity(t);

  const send = () =>
    client.inject({
      method: 'POST',
      url: '/api/auth/email-otp/send-verification-otp',
      payload: { email: uniqueEmail(), type: 'sign-in' },
    });

  const statuses = [await send(), await send(), await send(), await send()].map((response) => response.statusCode);

  assert.deepEqual(statuses, [200, 200, 200, 429]);
});

test('a different client is not held back by the first one hitting the limit', async (t) => {
  const first = await startIdentity(t);
  const second = await startIdentity(t);

  const send = (client: typeof first.client) =>
    client.inject({
      method: 'POST',
      url: '/api/auth/email-otp/send-verification-otp',
      payload: { email: uniqueEmail(), type: 'sign-in' },
    });

  await Promise.all([send(first.client), send(first.client), send(first.client), send(first.client)]);

  assert.equal((await send(second.client)).statusCode, 200);
});

test('a caller cannot dodge the limit by sending a different x-forwarded-for each time', async (t) => {
  const { client } = await startIdentity(t);

  const send = (spoofed: string) =>
    client.inject({
      method: 'POST',
      url: '/api/auth/email-otp/send-verification-otp',
      headers: { 'x-forwarded-for': spoofed },
      payload: { email: uniqueEmail(), type: 'sign-in' },
    });

  const statuses = [await send('203.0.113.1'), await send('203.0.113.2'), await send('203.0.113.3'), await send('203.0.113.4')].map(
    (response) => response.statusCode,
  );

  assert.deepEqual(statuses, [200, 200, 200, 429]);
});
