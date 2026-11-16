// Runs the server tests against a fresh database that a non-superuser owns, the way RDS does, because the
// compose Postgres user is a superuser and skips row-level security, which hides mistakes in the roles and grants.
// Run from the repo root with the local stack up: pnpm test:non-superuser
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';

const serverDir = new URL('../apps/server/', import.meta.url);
const { Client } = createRequire(new URL('package.json', serverDir))('pg');

const OWNER = 'compound_owner_check';
const ROLES = ['compound_api', 'compound_auth'];
const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]'];

const adminUrl = process.env.DATABASE_URL;

if (adminUrl === undefined) {
  throw new Error('DATABASE_URL is not set');
}

const ownerUrl = new URL(adminUrl);

if (!LOCAL_HOSTS.includes(ownerUrl.hostname)) {
  throw new Error(`Refusing to create a login role on ${ownerUrl.hostname}; this check only runs against a local database.`);
}

// The role can sign in to the whole server for as long as it exists, so its password is never written down.
ownerUrl.username = OWNER;

ownerUrl.password = randomBytes(24).toString('base64url');

ownerUrl.pathname = `/${OWNER}`;

const failures = [];
const admin = new Client({ connectionString: adminUrl });
let owner;

await admin.connect();

try {
  await admin.query(`drop database if exists ${OWNER} with (force)`);

  await admin.query(`drop role if exists ${OWNER}`);

  await admin.query(`create role ${OWNER} login nosuperuser nobypassrls createdb createrole password '${ownerUrl.password}'`);

  await admin.query(`create database ${OWNER} owner ${OWNER}`);

  // A real owner creates these roles in its own migration. When an earlier run on this server already did, the
  // owner has to be allowed to grant them, and nothing more.
  for (const role of ROLES) {
    const exists = await admin.query('select 1 from pg_roles where rolname = $1', [role]);

    if (exists.rowCount === 1) {
      await admin.query(`grant ${role} to ${OWNER} with admin option, inherit false, set false`);
    }
  }

  const suite = spawnSync(
    process.execPath,
    ['--env-file=../../.env.example', '--env-file-if-exists=../../.env', '--test', 'src/**/*.test.ts'],
    { cwd: serverDir, env: { ...process.env, DATABASE_URL: ownerUrl.href }, stdio: 'inherit' },
  );

  if (suite.status !== 0) {
    failures.push('The server tests failed when the owner is not a superuser.');
  }

  owner = new Client({ connectionString: ownerUrl.href });

  await owner.connect();

  const superuser = await owner.query('select rolsuper from pg_roles where rolname = current_user');

  if (superuser.rows[0]?.rolsuper !== false) {
    failures.push('The owner in this check is a superuser, so it proves nothing.');
  }

  for (const role of ROLES) {
    const membership = await owner.query(
      "select pg_has_role(current_user, $1, 'usage') as inherits, pg_has_role(current_user, $1, 'set') as can_set",
      [role],
    );

    if (membership.rows[0]?.inherits !== false || membership.rows[0]?.can_set !== true) {
      failures.push(
        `The owner must be able to switch to ${role} without inheriting its privileges: ${JSON.stringify(membership.rows[0])}.`,
      );
    }
  }

  await owner.query('begin');

  await owner.query('set local role compound_auth');

  const signedUp = await owner.query('select count(*)::int as n from accounts');

  await owner.query('rollback');

  const withoutSwitching = await owner.query('select count(*)::int as n from accounts');

  if (signedUp.rows[0]?.n === 0) {
    failures.push('No accounts were created by the tests, so the owner check below would prove nothing.');
  } else if (withoutSwitching.rows[0]?.n !== 0) {
    failures.push(`The owner reads ${withoutSwitching.rows[0]?.n} accounts rows without switching role.`);
  }
} catch (error) {
  failures.push(`The check itself failed: ${error instanceof Error ? error.message : String(error)}`);
} finally {
  await owner?.end().catch(() => {});

  await admin.query(`drop database if exists ${OWNER} with (force)`);

  await admin.query(`drop owned by ${OWNER}`).catch(() => {});

  await admin.query(`drop role if exists ${OWNER}`);

  await admin.end();
}

for (const failure of failures) {
  process.stderr.write(`${failure}\n`);
}

process.exitCode = failures.length === 0 ? 0 : 1;
