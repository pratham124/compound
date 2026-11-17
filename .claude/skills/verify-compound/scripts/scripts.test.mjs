// Runs the real verify-compound scripts against a fake adb, netstat, taskkill, pnpm and docker on PATH.
// The view trees in fixtures/ are uiautomator dumps taken from the emulator, not output of the matcher.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, delimiter, dirname, join, resolve } from 'node:path';
import { after, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: here, encoding: 'utf8' }).trim();
const worktreeName = basename(repoRoot);
const scriptPath = (name) => join(here, name);
const fixture = (name) => join(here, 'fixtures', name);
const dirs = [];

after(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })));

const slashed = (path) => path.replaceAll('\\', '/');

function executable(path, body) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `#!/usr/bin/env bash\n${body}\n`);
  chmodSync(path, 0o755);
}

// A fake machine: every fake tool appends its arguments to calls.log, and netstat prints `listeners`.
function makeMachine({ listeners = [], tree = fixture('today-signed-in.xml') } = {}) {
  const root = resolve(mkdtempSync(join(tmpdir(), 'verify-compound-')));
  dirs.push(root);

  const sdk = join(root, 'sdk');
  const bin = join(root, 'bin');
  const evidence = join(root, 'evidence');
  const calls = join(root, 'calls.log');
  const netstat = join(root, 'netstat.txt');

  mkdirSync(evidence);
  writeFileSync(calls, '');
  writeFileSync(netstat, listeners.map(([port, pid]) => `  TCP    0.0.0.0:${port}           0.0.0.0:0              LISTENING       ${pid}`).join('\n'));

  executable(
    join(sdk, 'platform-tools', 'adb.exe'),
    'echo "adb $*" >> "$FAKE_CALLS"\ncase "$*" in *"uiautomator dump"*) cat "$FAKE_TREE" ;; esac',
  );
  executable(join(bin, 'netstat'), 'cat "$FAKE_NETSTAT"');

  for (const tool of ['taskkill', 'pnpm', 'docker']) {
    executable(join(bin, tool), `echo "${tool} $*" >> "$FAKE_CALLS"`);
  }

  const env = {
    ...process.env,
    PATH: `${slashed(bin)}${delimiter}${process.env.PATH}`,
    ANDROID_HOME: slashed(sdk),
    VERIFY_EVIDENCE_ROOT: slashed(evidence),
    FAKE_CALLS: slashed(calls),
    FAKE_NETSTAT: slashed(netstat),
    FAKE_TREE: slashed(tree),
    DRIVE_WAIT: '0',
    DRIVE_RESTART_WAIT: '1',
  };

  return {
    evidence,
    calls: () => readFileSync(calls, 'utf8').split('\n').filter(Boolean),
    pointer: join(evidence, `latest-${worktreeName}`),
    // Records an unfinished run, as launch.sh would have left it.
    startRun(state) {
      const runId = '20260101-000000';
      const runDir = join(evidence, runId);
      const lines = { WORKTREE: slashed(repoRoot), RUN_ID: runId, RUN_DIR: slashed(runDir), EMAIL: 'verify-test@example.test', ...state };

      mkdirSync(runDir);
      writeFileSync(join(runDir, 'state.env'), Object.entries(lines).map(([k, v]) => `${k}=${v}`).join('\n') + '\n');
      writeFileSync(join(evidence, `latest-${worktreeName}`), runId);

      return runDir;
    },
    run(script, ...args) {
      return spawnSync('bash', [scriptPath(script), ...args], { cwd: repoRoot, env, encoding: 'utf8' });
    },
  };
}

const taskkills = (machine) => machine.calls().filter((line) => line.startsWith('taskkill'));

describe('cleanup.sh', () => {
  test('stops the recorded server and Metro while they still own their ports', () => {
    const machine = makeMachine({ listeners: [[3000, 4242], [8082, 5252]] });
    const runDir = machine.startRun({ SERVER_PID: 4242, METRO_PID: 5252, STACK_STARTED: 0, EMULATOR_STARTED: 0 });

    const result = machine.run('cleanup.sh');

    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(taskkills(machine), ['taskkill //PID 4242 //T //F', 'taskkill //PID 5252 //T //F']);
    assert.ok(existsSync(join(runDir, 'state.env')), 'evidence folder is kept');
    assert.ok(!existsSync(machine.pointer), 'the run is closed');
  });

  test('never kills a process that now owns the port but is not the recorded one', () => {
    const machine = makeMachine({ listeners: [[3000, 9999], [8082, 8888]] });

    machine.startRun({ SERVER_PID: 4242, METRO_PID: 5252, STACK_STARTED: 0, EMULATOR_STARTED: 0 });

    const result = machine.run('cleanup.sh');

    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(taskkills(machine), []);
  });

  test('gets through every step when the launch died before recording anything', () => {
    const machine = makeMachine();

    machine.startRun({ STACK_STARTED: 1, EMULATOR_STARTED: 1 });

    const result = machine.run('cleanup.sh');

    assert.equal(result.status, 0, result.stderr);
    assert.ok(machine.calls().some((line) => line.includes('emu kill')));
  });

  test('leaves the shared stack running when the run found it already up', () => {
    const machine = makeMachine();

    machine.startRun({ STACK_STARTED: 0, EMULATOR_STARTED: 0 });

    assert.equal(machine.run('cleanup.sh').status, 0);
    assert.ok(!machine.calls().includes('pnpm stack:down'));
  });

  test('force-stops the app and leaves the emulator running when this run did not boot it', () => {
    const machine = makeMachine();

    machine.startRun({ STACK_STARTED: 0, EMULATOR_STARTED: 0 });

    assert.equal(machine.run('cleanup.sh').status, 0);
    assert.ok(!machine.calls().some((line) => line.includes('emu kill')));
    assert.ok(machine.calls().some((line) => line.includes('am force-stop com.pratham124.compound')));
  });

  test('takes the stack down when the run brought it up', () => {
    const machine = makeMachine();

    machine.startRun({ STACK_STARTED: 1, EMULATOR_STARTED: 0 });

    assert.equal(machine.run('cleanup.sh').status, 0);
    assert.ok(machine.calls().includes('pnpm stack:down'));
  });
});

describe('launch.sh', () => {
  test('refuses to start while an earlier run was never cleaned up, and touches nothing', () => {
    const machine = makeMachine();

    machine.startRun({ SERVER_PID: 4242, STACK_STARTED: 1 });

    const before = readdirSync(machine.evidence).sort();
    const result = machine.run('launch.sh');

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Run 20260101-000000 was not cleaned up; run cleanup\.sh first\./);
    assert.deepEqual(machine.calls(), []);
    assert.deepEqual(readdirSync(machine.evidence).sort(), before);
    assert.equal(readFileSync(machine.pointer, 'utf8'), '20260101-000000');
  });
});

describe('drive.sh finds views by label in real uiautomator dumps', () => {
  test('matches a notice whose text has an apostrophe, which uiautomator writes unescaped', () => {
    const machine = makeMachine({ tree: fixture('wrong-code-notice.xml') });

    machine.startRun({});

    const result = machine.run('drive.sh', 'find', "That code didn't work. Ask for a new one.");

    assert.equal(result.status, 0, result.stderr);
    // bounds="[44,505][1036,552]" in the dump
    assert.equal(result.stdout.trim(), '44 505 1036 552');
  });

  test('taps the centre of the view', () => {
    const machine = makeMachine();

    machine.startRun({});

    assert.equal(machine.run('drive.sh', 'tap', 'Train').status, 0);
    // The tab spans [216,2054][432,2274] in the dump.
    assert.ok(machine.calls().includes('adb -s emulator-5554 shell input tap 324 2164'));
  });

  test('taps the chat button where it is drawn, though uiautomator reports its width and height as the corner', () => {
    const machine = makeMachine();

    machine.startRun({});

    assert.equal(machine.run('drive.sh', 'tap', 'Ask Compound').status, 0);
    // The dump says bounds="[904,1928][154,154]". The button sits at the bottom right of the 1080x2340 screen in the
    // screenshot taken at the same time, about x 980, y 2005.
    assert.ok(machine.calls().includes('adb -s emulator-5554 shell input tap 981 2005'));
  });

  test('exits 1 and taps nothing when the label is not in the tree', () => {
    const machine = makeMachine();

    machine.startRun({});

    const result = machine.run('drive.sh', 'find', 'No such label');

    assert.equal(result.status, 1);
    assert.ok(!machine.calls().some((line) => line.includes('input tap')));
  });
});

describe('drive.sh dev-menu', () => {
  test('closes the development client menu by its Close button', () => {
    const machine = makeMachine({ tree: fixture('dev-menu.xml') });

    machine.startRun({});
    machine.run('drive.sh', 'dev-menu');

    // Close spans [943,1040][987,1084] in the dump.
    assert.ok(machine.calls().includes('adb -s emulator-5554 shell input tap 965 1062'));
  });

  test("leaves the app's own Close button on the quick-chat sheet alone", () => {
    const machine = makeMachine({ tree: fixture('quick-chat-sheet.xml') });

    machine.startRun({});

    const result = machine.run('drive.sh', 'dev-menu');

    assert.equal(result.status, 0, result.stderr);
    assert.ok(!machine.calls().some((line) => line.includes('input tap')));
  });
});
