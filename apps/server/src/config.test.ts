import assert from 'node:assert/strict';
import { test } from 'node:test';

import { parseConfig } from './config.ts';

const baseEnv = {
  DATABASE_URL: 'postgres://u:p@localhost:5433/db',
  VALKEY_URL: 'redis://localhost:6380',
  SQS_ENDPOINT: 'http://localhost:9324',
  BETTER_AUTH_SECRET: 'a-secret-that-is-at-least-32-characters-long',
  BETTER_AUTH_URL: 'http://localhost:3000',
  SIGN_IN_MAILER: 'console',
};

test('the console mailer is accepted outside production', () => {
  assert.equal(parseConfig({ ...baseEnv, NODE_ENV: 'development' }).signInMailer, 'console');
});

test('the server refuses to start with the console mailer in production, because it prints sign-in codes', () => {
  assert.throws(() => parseConfig({ ...baseEnv, NODE_ENV: 'production' }), /console mailer/);
});

test('a missing SIGN_IN_MAILER is an error rather than a silent default', () => {
  const { SIGN_IN_MAILER: _omitted, ...withoutMailer } = baseEnv;

  assert.throws(() => parseConfig(withoutMailer));
});

test('the Postgres connection budget defaults to the starting value in docs/prd/numbers.md', () => {
  assert.equal(parseConfig(baseEnv).databasePoolMax, 10);
});

test('the Postgres connection budget is read from DATABASE_POOL_MAX', () => {
  assert.equal(parseConfig({ ...baseEnv, DATABASE_POOL_MAX: '14' }).databasePoolMax, 14);
});

test('a connection budget too small to leave the api pool a connection is refused', () => {
  assert.throws(() => parseConfig({ ...baseEnv, DATABASE_POOL_MAX: '5' }));
});
