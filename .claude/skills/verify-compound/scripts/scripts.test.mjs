// Runs the real verify-compound scripts against a fake adb, netstat, taskkill, pnpm and docker on PATH.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, delimiter, dirname, join, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { after, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: here, encoding: 'utf8' }).trim();
const worktreeName = basename(repoRoot);
const scriptPath = (name) => join(here, name);
const dirs = [];
const PHONE_WORKOUT_ID = '01930000-0000-7000-8000-0000000000ff';

after(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })));

const slashed = (path) => path.replaceAll('\\', '/');

// After `emu kill` the serial stays listed for FAKE_KILL_LINGER more `adb devices` calls, as a shutting-down QEMU does.
// FAKE_LISTING overrides the state it is listed in; "none" means not listed.
const fakeDevices = `fake_devices() {
  local state="\${FAKE_LISTING:-device}" polls
  if [ -f "$FAKE_CALLS.killed" ]; then
    polls=$(cat "$FAKE_CALLS.killed")
    echo $((polls + 1)) > "$FAKE_CALLS.killed"
    [ "$polls" -ge "\${FAKE_KILL_LINGER:-0}" ] && state=none
  fi
  printf "List of devices attached\\n"
  [ "$state" = none ] || printf "emulator-5554\\t%s\\n" "$state"
}`;

function executable(path, body) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `#!/usr/bin/env bash\n${body}\n`);
  chmodSync(path, 0o755);
}

// A fake machine: every fake tool appends its arguments to calls.log, and netstat prints `listeners`.
function makeMachine({
  listeners = [],
  maestroBody = 'echo "maestro $*" >> "$FAKE_CALLS"',
  adbExtra = '',
  pnpmExtra = '',
  curlBody = 'case "$*" in *"/health"*) echo \'{"status":"ok"}\' ;; *"/status"*) echo "packager-status:running" ;; esac',
} = {}) {
  const root = resolve(mkdtempSync(join(tmpdir(), 'verify-compound-')));
  dirs.push(root);

  const sdk = join(root, 'sdk');
  const bin = join(root, 'bin');
  const evidence = join(root, 'evidence');
  const calls = join(root, 'calls.log');
  const netstat = join(root, 'netstat.txt');
  const phoneDb = join(root, 'compound.db');

  mkdirSync(evidence);
  writeFileSync(calls, '');

  // The phone's database as run-flow.sh copies it off the emulator: one finished workout.
  const phone = new DatabaseSync(phoneDb);

  phone.exec(`CREATE TABLE workouts (id TEXT PRIMARY KEY, user_id TEXT, finished_at INTEGER, body TEXT); INSERT INTO workouts VALUES ('${PHONE_WORKOUT_ID}', 'person', 1000, '{}')`);
  phone.close();
  writeFileSync(netstat, listeners.map(([port, pid]) => `  TCP    0.0.0.0:${port}           0.0.0.0:0              LISTENING       ${pid}`).join('\n'));

  executable(
    join(sdk, 'platform-tools', 'adb.exe'),
    `${fakeDevices}\necho "adb $*" >> "$FAKE_CALLS"\n${adbExtra}\ncase "$*" in *"emu kill"*) echo 0 > "$FAKE_CALLS.killed" ;; *"getprop sys.boot_completed"*) echo 1 ;; *"devices"*) fake_devices ;; *"pm list packages com.pratham124.compound"*) echo "package:com.pratham124.compound" ;; *"pm list packages dev.mobile.maestro"*) echo "package:dev.mobile.maestro" ;; *"getprop persist.sys.timezone"*) echo "UTC" ;; *"settings get system font_scale"*) echo "\${FAKE_FONT_SCALE:-null}" ;; *"files/SQLite/compound.db") cat "$FAKE_PHONE_DB" ;; esac`,
  );
  executable(join(bin, 'netstat'), 'cat "$FAKE_NETSTAT"');
  executable(join(bin, 'maestro'), maestroBody);
  executable(join(bin, 'curl'), curlBody);

  executable(join(bin, 'taskkill'), 'echo "taskkill $*" >> "$FAKE_CALLS"');
  executable(join(bin, 'pnpm'), `echo "pnpm $*" >> "$FAKE_CALLS"\n${pnpmExtra}`);

  // psql count queries answer FAKE_SERVER_WORKOUTS (default 1): the workouts the server holds for the test person.
  executable(join(bin, 'docker'), `echo "docker $*" >> "$FAKE_CALLS"\ncase "$*" in *"select count(*)"*) echo "\${FAKE_SERVER_WORKOUTS:-1}" ;; esac`);

  const env = {
    ...process.env,
    PATH: `${slashed(bin)}${delimiter}${process.env.PATH}`,
    ANDROID_HOME: slashed(sdk),
    MAESTRO: slashed(join(bin, 'maestro')),
    VERIFY_EVIDENCE_ROOT: slashed(evidence),
    FAKE_CALLS: slashed(calls),
    FAKE_NETSTAT: slashed(netstat),
    FAKE_PHONE_DB: slashed(phoneDb),
    DRIVE_WAIT: '0',
    RUN_FLOW_RETRY: '0',
    SERVER_RECORD_WAIT: '0',
  };

  return {
    evidence,
    env,
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
    writeMetroOwner({ pid, worktree = slashed(repoRoot), apiUrl = 'http://localhost:3000' }) {
      writeFileSync(
        join(evidence, 'metro-8082.env'),
        `METRO_PID=${pid}\nMETRO_WORKTREE=${worktree}\nMETRO_API_URL=${apiUrl}\n`,
      );
    },
    run(script, ...args) {
      return spawnSync('bash', [scriptPath(script), ...args], { cwd: repoRoot, env, encoding: 'utf8' });
    },
    runWithEnv(extraEnv, script, ...args) {
      return spawnSync('bash', [scriptPath(script), ...args], { cwd: repoRoot, env: { ...env, ...extraEnv }, encoding: 'utf8' });
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

  test('waits for the emulator to drop out of adb devices after emu kill, so a launch right after cannot see it', () => {
    const machine = makeMachine();

    machine.startRun({ STACK_STARTED: 0, EMULATOR_STARTED: 1 });

    const result = machine.runWithEnv({ FAKE_KILL_LINGER: '3' }, 'cleanup.sh');

    assert.equal(result.status, 0, result.stderr);
    const adbCalls = machine.calls().filter((line) => line.startsWith('adb '));
    const killIdx = adbCalls.findIndex((line) => line.includes('emu kill'));
    const polls = adbCalls.slice(killIdx + 1).filter((line) => line === 'adb devices');
    assert.equal(polls.length, 4, 'polls until the serial is gone');
    assert.match(result.stdout, /stopped emulator emulator-5554/);
  });

  test('says so instead of claiming the emulator stopped when it is still listed after the bounded wait', () => {
    const machine = makeMachine();

    machine.startRun({ STACK_STARTED: 0, EMULATOR_STARTED: 1 });

    const result = machine.runWithEnv({ FAKE_KILL_LINGER: '99', EMU_KILL_WAIT: '2' }, 'cleanup.sh');

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stderr, /still listed after 2s/);
    assert.doesNotMatch(result.stdout, /stopped emulator/);
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

  test('leaves a reused Metro running when METRO_STARTED=0', () => {
    const machine = makeMachine({ listeners: [[3000, 4242], [8082, 5252]] });

    machine.startRun({ SERVER_PID: 4242, METRO_PID: 5252, METRO_STARTED: 0, STACK_STARTED: 0, EMULATOR_STARTED: 0 });
    machine.writeMetroOwner({ pid: 5252 });

    const result = machine.run('cleanup.sh');

    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(taskkills(machine), ['taskkill //PID 4242 //T //F']);
    assert.ok(existsSync(join(machine.evidence, 'metro-8082.env')));
  });

  test('keeps a launched Metro running when --keep-metro is passed', () => {
    const machine = makeMachine({ listeners: [[3000, 4242], [8082, 5252]] });

    machine.startRun({ SERVER_PID: 4242, METRO_PID: 5252, METRO_STARTED: 1, STACK_STARTED: 0, EMULATOR_STARTED: 0 });
    machine.writeMetroOwner({ pid: 5252 });

    const result = machine.run('cleanup.sh', '--keep-metro');

    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(taskkills(machine), ['taskkill //PID 4242 //T //F']);
    assert.ok(existsSync(join(machine.evidence, 'metro-8082.env')));
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

  test('does not reuse or reboot an emulator that is listed as offline, and fails before adb reverse', () => {
    const machine = makeMachine({ listeners: [[8082, 5252]] });

    machine.writeMetroOwner({ pid: 5252 });

    const result = machine.runWithEnv({ FAKE_LISTING: 'offline', EMU_SETTLE_WAIT: '2' }, 'launch.sh', '--signed-out');

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /listed as 'offline'/);
    assert.ok(!machine.calls().some((line) => line.includes('reverse tcp')));
  });

  test('refuses to reuse Metro on 8082 when it belongs to another worktree, before starting a server it could not record', () => {
    const machine = makeMachine({ listeners: [[8082, 5252]] });

    machine.writeMetroOwner({ pid: 5252, worktree: '/c/other/worktree' });

    const result = machine.run('launch.sh', '--signed-out');

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /not this worktree's Metro/);
    assert.ok(!machine.calls().some((line) => line.includes('@compound/mobile start')));
    assert.ok(!machine.calls().some((line) => line.includes('@compound/server start')), 'no server left behind for cleanup to miss');
  });

  test('a launch that fails after starting the server records the server once it listens, so cleanup can stop it', () => {
    const machine = makeMachine({
      listeners: [[8082, 5252]],
      // The server starts listening as pnpm starts it; the app is not installed, so launch fails right after.
      pnpmExtra: 'case "$*" in *"@compound/server start"*) printf "\\n  TCP    0.0.0.0:3000           0.0.0.0:0              LISTENING       4242" >> "$FAKE_NETSTAT" ;; esac',
      adbExtra: 'case "$*" in *"pm list packages com.pratham124.compound"*) exit 0 ;; esac',
    });

    machine.writeMetroOwner({ pid: 5252 });

    const result = machine.runWithEnv({ SERVER_RECORD_WAIT: '5' }, 'launch.sh', '--signed-out');

    assert.notEqual(result.status, 0);
    const runId = readFileSync(machine.pointer, 'utf8').trim();
    assert.match(readFileSync(join(machine.evidence, runId, 'state.env'), 'utf8'), /^SERVER_PID=4242$/m);
  });

  test('reuses a running Metro on 8082 when owned by this worktree and records METRO_STARTED=0', () => {
    const machine = makeMachine({ listeners: [[8082, 5252]] });

    machine.writeMetroOwner({ pid: 5252 });

    const result = machine.run('launch.sh', '--signed-out');

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /READY:/);
    assert.ok(!machine.calls().some((line) => line.includes('@compound/mobile start')));
    assert.ok(!machine.calls().some((line) => line.includes('8081')));
    assert.ok(machine.calls().some((line) => line.includes('run-as com.pratham124.compound rm -rf shared_prefs/SecureStore.xml files/SQLite')), 'session and databases removed');
    assert.ok(!machine.calls().some((line) => line.includes('pm clear')), 'dev client preferences left alone');
    const runId = readFileSync(machine.pointer, 'utf8').trim();
    const state = readFileSync(join(machine.evidence, runId, 'state.env'), 'utf8');
    assert.match(state, /^METRO_STARTED=0$/m);
    assert.match(state, /^METRO_PID=5252$/m);
  });
});

describe('run-flow.sh', () => {
  test('exits non-zero when no flow file matches the requested feature', () => {
    const machine = makeMachine();

    machine.startRun({});

    const result = machine.run('run-flow.sh', 'no-such-feature');

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /No Maestro flow found/);
    assert.deepEqual(machine.calls(), []);
  });

  test('runs maestro test, writes logs and copies only explicit screenshots into EVIDENCE_DIR', () => {
    const maestroBody = [
      'echo "maestro $*" >> "$FAKE_CALLS"',
      'out=""',
      'while [ $# -gt 0 ]; do',
      '  if [ "$1" = "--test-output-dir" ]; then out="$2"; shift 2; else shift; fi',
      'done',
      'mkdir -p "$out/takeScreenshot" "$out/screenshots"',
      'printf "png" > "$out/takeScreenshot/tab-shell-today.png"',
      'printf "dbg" > "$out/screenshots/step-001-tap.png"',
    ].join('\n');
    const machine = makeMachine({ maestroBody });
    const runDir = machine.startRun({});

    const result = machine.run('run-flow.sh', 'tab-shell');

    assert.equal(result.status, 0, result.stderr);
    assert.ok(existsSync(join(runDir, 'tab-shell-today.png')), 'explicit takeScreenshot PNG copied');
    assert.ok(!existsSync(join(runDir, 'step-001-tap.png')), 'Maestro internal step-* PNG excluded');
    assert.ok(existsSync(join(runDir, 'tab-shell-maestro.log')), 'maestro log written');
    assert.ok(machine.calls().some((line) => line.includes('maestro test') && line.includes('-e EMAIL=verify-test@example.test')));
  });

  test('runs several features in order on one Launch, returning to Today between them, and prints a summary', () => {
    const machine = makeMachine();

    machine.startRun({});

    const result = machine.run('run-flow.sh', 'tab-shell', 'profile');

    assert.equal(result.status, 0, result.stderr);
    const flows = machine.calls().filter((line) => line.startsWith('maestro')).map((line) => /(\w[\w-]*)\.yaml$/.exec(line)?.[1]);
    assert.deepEqual(flows, ['_to-today', 'tab-shell', '_to-today', 'profile']);
    assert.match(result.stdout, /^PASS tab-shell \d+s$/m);
    assert.match(result.stdout, /^PASS profile \d+s$/m);
  });

  test('runs the remaining features after one fails, then exits non-zero with FAIL in the summary', () => {
    const maestroBody = ['echo "maestro $*" >> "$FAKE_CALLS"', 'case "$*" in *tab-shell.yaml*) exit 1 ;; esac'].join('\n');
    const machine = makeMachine({ maestroBody });

    machine.startRun({});

    const result = machine.run('run-flow.sh', 'tab-shell', 'profile');

    assert.notEqual(result.status, 0);
    assert.ok(machine.calls().some((line) => line.endsWith('profile.yaml')), 'profile still ran');
    assert.match(result.stdout, /^FAIL tab-shell \d+s$/m);
    assert.match(result.stdout, /^PASS profile \d+s$/m);
  });

  test('reports a flow that fails once and passes on retry as FLAKY, keeping both attempts apart, and exits 0', () => {
    const maestroBody = [
      'echo "maestro $*" >> "$FAKE_CALLS"',
      'out=""',
      'while [ $# -gt 0 ]; do',
      '  if [ "$1" = "--test-output-dir" ]; then out="$2"; shift 2; else shift; fi',
      'done',
      'mkdir -p "$out/takeScreenshot"; printf png > "$out/takeScreenshot/shot.png"',
      'case "$out" in *profile*) if [ ! -f "$FAKE_CALLS.failed" ]; then touch "$FAKE_CALLS.failed"; exit 1; fi ;; esac',
    ].join('\n');
    const machine = makeMachine({ maestroBody });
    const runDir = machine.startRun({});

    const result = machine.runWithEnv({ RUN_FLOW_RETRY: '1' }, 'run-flow.sh', 'profile');

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /^FLAKY profile \d+s then \d+s$/m);
    assert.ok(existsSync(join(runDir, 'profile-maestro.log')) && existsSync(join(runDir, 'profile-retry-maestro.log')), 'both attempts keep a log');
    assert.ok(existsSync(join(runDir, 'shot-retry.png')), 'the retry screenshots carry a suffix');
  });

  test('reports FAIL and exits non-zero when the retry fails too, and not at all when RUN_FLOW_RETRY=0', () => {
    const maestroBody = ['echo "maestro $*" >> "$FAKE_CALLS"', 'case "$*" in *profile.yaml*) exit 1 ;; esac'].join('\n');
    const machine = makeMachine({ maestroBody });

    machine.startRun({});

    const retried = machine.runWithEnv({ RUN_FLOW_RETRY: '1' }, 'run-flow.sh', 'profile');

    assert.notEqual(retried.status, 0);
    assert.match(retried.stdout, /^FAIL profile \d+s then \d+s$/m);
    assert.equal(machine.calls().filter((line) => line.endsWith('profile.yaml')).length, 2, 'one retry, no more');

    const single = machine.run('run-flow.sh', 'profile');

    assert.match(single.stdout, /^FAIL profile \d+s$/m);
    assert.equal(machine.calls().filter((line) => line.endsWith('profile.yaml')).length, 3, 'no retry when turned off');
  });

  test('runs a feature deep flow only with --deep, offline, after its base flow', () => {
    const machine = makeMachine();

    machine.startRun({});

    assert.equal(machine.run('run-flow.sh', 'workouts').status, 0);
    assert.ok(!machine.calls().some((line) => line.endsWith('workouts-deep.yaml')), 'no deep flow without --deep');

    const result = machine.run('run-flow.sh', '--deep', 'workouts', 'tab-shell');

    assert.equal(result.status, 0, result.stderr);
    const calls = machine.calls();
    const deepIdx = calls.findIndex((line) => line.endsWith('workouts-deep.yaml'));
    const offIdx = calls.findLastIndex((line, i) => i < deepIdx && line.includes('svc wifi disable'));
    const baseIdx = calls.findLastIndex((line, i) => i < offIdx && line.endsWith('workouts.yaml'));
    assert.ok(baseIdx >= 0 && offIdx > baseIdx && deepIdx > offIdx, 'base, then network off, then deep');
    assert.ok(!calls.some((line) => line.endsWith('tab-shell-deep.yaml')), 'no deep flow exists for tab-shell');
    assert.match(result.stdout, /^PASS workouts-deep \d+s$/m);
  });

  test('workouts fails when the workout finished offline never reaches the server after the network returns', () => {
    const machine = makeMachine();

    machine.env.FAKE_SERVER_WORKOUTS = '0';
    machine.env.SYNC_WAIT = '1';
    machine.startRun({});

    const result = machine.run('run-flow.sh', 'workouts');

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /did not upload by itself/);
    const calls = machine.calls();
    const restoreIdx = calls.findIndex((line) => line.includes('svc wifi enable; svc data enable'));
    const queryIdx = calls.findIndex((line) => line.startsWith('docker compose exec -T postgres psql'));
    assert.ok(restoreIdx >= 0 && queryIdx > restoreIdx, 'the server is checked only after the network is back');
  });

  test('workouts-deep waits for the id of the workout the phone just finished, read from the phone after the offline phase', () => {
    const machine = makeMachine();

    machine.startRun({});

    const result = machine.run('run-flow.sh', 'workouts-deep');

    assert.equal(result.status, 0, result.stderr);
    const calls = machine.calls();
    const copyIdx = calls.findIndex((line) => line.endsWith('cat files/SQLite/compound.db'));
    const relaunchIdx = calls.findIndex((line) => line.includes('PHASE=relaunch'));
    assert.ok(copyIdx >= 0 && relaunchIdx > copyIdx, 'the id is read before the relaunch');
    assert.ok(calls.some((line) => line.startsWith('docker compose exec') && line.includes(`w.id = '${PHONE_WORKOUT_ID}'`)), 'the server is asked for that workout by id');
  });

  test('rejects an unknown option before touching the emulator', () => {
    const machine = makeMachine();

    machine.startRun({});

    const result = machine.run('run-flow.sh', '--bogus', 'workouts');

    assert.equal(result.status, 2);
    assert.deepEqual(machine.calls(), []);
  });

  test('restores adb reverse :3000 and wifi/data when workouts offline phase fails', () => {
    const maestroBody = [
      'echo "maestro $*" >> "$FAKE_CALLS"',
      'case "$*" in *"PHASE=offline"*) exit 1 ;; esac',
    ].join('\n');
    const machine = makeMachine({ maestroBody });

    machine.startRun({});

    const result = machine.run('run-flow.sh', 'workouts');

    assert.notEqual(result.status, 0);
    const adbCalls = machine.calls().filter((line) => line.startsWith('adb '));
    const dropIdx = adbCalls.findIndex((line) => line.includes('reverse --remove tcp:3000'));
    const disableIdx = adbCalls.findIndex((line) => line.includes('svc wifi disable; svc data disable'));
    const restoreRevIdx = adbCalls.findIndex((line, i) => i > dropIdx && line.includes('reverse tcp:3000 tcp:3000'));
    const restoreNetIdx = adbCalls.findIndex((line, i) => i > disableIdx && line.includes('svc wifi enable; svc data enable'));
    assert.ok(dropIdx >= 0, 'API reverse removed before offline phase');
    assert.ok(disableIdx >= 0, 'wifi/data disabled before offline phase');
    assert.ok(restoreRevIdx > dropIdx, 'API reverse restored on failure');
    assert.ok(restoreNetIdx > disableIdx, 'wifi/data restored on failure');
  });

  test('restores original font_scale when workouts-fixtures large-text phase fails', () => {
    const maestroBody = [
      'echo "maestro $*" >> "$FAKE_CALLS"',
      'case "$*" in *"PHASE=fixtures-large-text"*) exit 1 ;; esac',
    ].join('\n');
    const machine = makeMachine({ maestroBody });

    machine.env.FAKE_FONT_SCALE = '1.15';
    machine.startRun({});

    const result = machine.run('run-flow.sh', 'workouts-fixtures');

    assert.notEqual(result.status, 0);
    const adbCalls = machine.calls().filter((line) => line.startsWith('adb '));
    const setIdx = adbCalls.findIndex((line) => line.includes('settings put system font_scale 2.0'));
    const restoreIdx = adbCalls.findIndex((line, i) => i > setIdx && line.includes('settings put system font_scale 1.15'));
    assert.ok(setIdx >= 0, 'font_scale set to 2.0');
    assert.ok(restoreIdx > setIdx, 'original font_scale restored on failure');
  });
});

describe('drive.sh', () => {
  test('env prints the run folder, email and adb for eval', () => {
    const machine = makeMachine();

    const runDir = machine.startRun({});
    const result = machine.run('drive.sh', 'env');

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /^EVIDENCE_DIR=.*20260101-000000$/m);
    assert.match(result.stdout, /^EMAIL=verify-test@example\.test$/m);
  });

  test('code prints the latest code the server logged for the run email, and fails when none arrives', () => {
    const machine = makeMachine();

    const runDir = machine.startRun({});

    assert.equal(machine.run('drive.sh', 'code').status, 1);

    writeFileSync(
      join(runDir, 'server.log'),
      '[dev mailer] sign-in code for verify-test@example.test: 111111\n[dev mailer] sign-in code for verify-test@example.test: 222222\n',
    );

    assert.equal(machine.run('drive.sh', 'code').stdout.trim(), '222222');
  });
});
