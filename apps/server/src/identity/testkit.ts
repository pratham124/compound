import assert from 'node:assert/strict';
import { randomInt, randomUUID } from 'node:crypto';
import type { TestContext } from 'node:test';

import type { InjectOptions } from 'fastify';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';

import { buildApp } from '../app.ts';
import { parseConfig } from '../config.ts';
import { connect } from '../connections.ts';
import { createAuth } from './auth.ts';
import type { SignInCodeMailer } from './mailer.ts';
import { migrate } from './migrate.ts';

export type SentCode = { email: string; code: string };

export async function startIdentity(t: TestContext) {
  const config = parseConfig(process.env);
  const connections = connect(config);

  t.after(() => connections.close());
  await migrate(connections.pool);

  const sentCodes: SentCode[] = [];

  const mailer: SignInCodeMailer = {
    sendSignInCode: async (message) => {
      sentCodes.push(message);
    },
  };

  const auth = createAuth({ pool: connections.authPool, valkey: connections.valkey, config, mailer });
  const app = buildApp({ logger: false, healthChecks: connections.healthChecks, auth, apiPool: connections.apiPool });

  t.after(() => app.close());

  // Rate limits count per client address, so each test is a different client and tests don't use up each other's allowance.
  const remoteAddress = `10.${randomInt(256)}.${randomInt(256)}.${randomInt(1, 255)}`;
  const client = { inject: (options: InjectOptions) => app.inject({ remoteAddress, ...options }) };

  return { app, client, config, connections, sentCodes };
}

export async function signInByEmail(client: Awaited<ReturnType<typeof startIdentity>>['client'], sentCodes: { code: string }[]) {
  const email = uniqueEmail();

  await client.inject({ method: 'POST', url: '/api/auth/email-otp/send-verification-otp', payload: { email, type: 'sign-in' } });

  const response = await client.inject({
    method: 'POST',
    url: '/api/auth/sign-in/email-otp',
    payload: { email, otp: sentCodes.at(-1)?.code },
  });

  assert.equal(response.statusCode, 200);

  return { email, response };
}

export function uniqueEmail(): string {
  return `${randomUUID()}@example.test`;
}

const APPLE_KEYS_URL = 'https://appleid.apple.com/auth/keys';

/** Signs tokens the way Apple does and makes only Apple's key URL answer with the matching public key. */
export async function fakeApple(t: TestContext, audience: string) {
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  const jwk = { ...(await exportJWK(publicKey)), kid: 'test-key', alg: 'RS256', use: 'sig' };
  const realFetch = globalThis.fetch;

  t.mock.method(globalThis, 'fetch', async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
    const url = input instanceof Request ? input.url : input.toString();

    return url === APPLE_KEYS_URL ? Response.json({ keys: [jwk] }) : realFetch(input, init);
  });

  return {
    idToken: (claims: { sub: string; email: string }) =>
      new SignJWT({ email: claims.email, email_verified: 'true' })
        .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
        .setIssuer('https://appleid.apple.com')
        .setAudience(audience)
        .setSubject(claims.sub)
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(privateKey),
  };
}

export function cookieHeader(response: { cookies: { name: string; value: string }[] }): string {
  return response.cookies.map(({ name, value }) => `${name}=${value}`).join('; ');
}

export function sessionTokenOf(response: { cookies: { name: string; value: string }[] }): string {
  const cookie = response.cookies.find(({ name }) => name.endsWith('session_token'));

  if (cookie === undefined) {
    throw new Error('No session cookie in the response');
  }

  return decodeURIComponent(cookie.value).split('.')[0] ?? '';
}
