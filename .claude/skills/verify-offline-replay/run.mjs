// Runs the offline-replay check from the repo root: TLC on the model as the code is (must pass), TLC on each broken
// variant (each must fail on the invariant its cfg names, so the model can still fail), then the property test that
// replays generated uploads against the real server and Postgres. Needs Java 11+ and, for the last step, the local stack.
// Usage: node .claude/skills/verify-offline-replay/run.mjs [--model-only]
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const TLA_VERSION = 'v1.7.4';
const TLA_SHA256 = '936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88';
const TLA_URL = `https://github.com/tlaplus/tlaplus/releases/download/${TLA_VERSION}/tla2tools.jar`;

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..', '..', '..');
const cacheRoot = process.env.LOCALAPPDATA ?? join(homedir(), '.cache');
const jar = join(cacheRoot, 'compound-tla', TLA_VERSION, 'tla2tools.jar');

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

async function ensureJar() {
  if (existsSync(jar) && sha256(jar) === TLA_SHA256) {
    return;
  }

  mkdirSync(dirname(jar), { recursive: true });
  const response = await fetch(TLA_URL);

  if (!response.ok) {
    throw new Error(`Downloading ${TLA_URL} failed: ${response.status}`);
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  const digest = createHash('sha256').update(bytes).digest('hex');

  if (digest !== TLA_SHA256) {
    throw new Error(`${TLA_URL} has sha256 ${digest}, expected ${TLA_SHA256}; not using it`);
  }

  writeFileSync(jar, bytes);
}

function tlc(config) {
  const metadir = mkdtempSync(join(tmpdir(), 'compound-tlc-'));

  try {
    const run = spawnSync('java', ['-XX:+UseParallelGC', '-cp', jar, 'tlc2.TLC', '-workers', 'auto', '-deadlock', '-metadir', metadir, '-config', config, 'OfflineReplay.tla'], { cwd: here, encoding: 'utf8' });

    return `${run.stdout ?? ''}${run.stderr ?? ''}`;
  } finally {
    rmSync(metadir, { recursive: true, force: true });
  }
}

const failures = [];

await ensureJar();

const main = tlc('OfflineReplay.cfg');

if (main.includes('Model checking completed. No error has been found.')) {
  console.log('PASS model: OfflineReplay.cfg (the code as it is)');
} else {
  failures.push('model');
  console.log(`FAIL model: OfflineReplay.cfg\n${main.split('\n').slice(-60).join('\n')}`);
}

for (const name of readdirSync(join(here, 'broken')).filter((file) => file.endsWith('.cfg')).sort()) {
  const config = `broken/${name}`;
  const expected = /\\\* expect: (\w+)/.exec(readFileSync(join(here, config), 'utf8'))?.[1];
  const output = tlc(config);

  if (expected !== undefined && output.includes(`Invariant ${expected} is violated`)) {
    console.log(`PASS broken variant ${name}: fails on ${expected}, as it should`);
  } else {
    failures.push(name);
    console.log(`FAIL broken variant ${name}: expected ${expected ?? '(no expect line)'} to be violated\n${output.split('\n').slice(-30).join('\n')}`);
  }
}

if (!process.argv.includes('--model-only')) {
  const test = spawnSync(process.execPath, ['--env-file=../../.env.example', '--env-file-if-exists=../../.env', '--test', 'src/workouts/lastWriteWins.test.ts'], { cwd: join(repo, 'apps', 'server'), encoding: 'utf8' });

  if (test.status === 0) {
    console.log('PASS real code: apps/server/src/workouts/lastWriteWins.test.ts (generated replays against Postgres)');
  } else {
    failures.push('real code');
    console.log(`FAIL real code: apps/server/src/workouts/lastWriteWins.test.ts\n${`${test.stdout}${test.stderr}`.split('\n').slice(-40).join('\n')}`);
  }
}

process.exit(failures.length === 0 ? 0 : 1);
