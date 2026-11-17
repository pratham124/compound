import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { after, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const hook = join(dirname(fileURLToPath(import.meta.url)), 'confirm-main-writes.mjs');
const dirs = [];

after(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })));

function repoOn(branch) {
  const repo = resolve(mkdtempSync(join(tmpdir(), 'main-writes-')));
  dirs.push(repo);
  execFileSync('git', ['init', '-b', branch], { cwd: repo, stdio: 'ignore' });
  return repo;
}

function run(command, cwd, extraEnv = {}) {
  const env = { ...process.env, NO_MISTAKES_GATE: '', ...extraEnv };
  return spawnSync('node', [hook], { input: JSON.stringify({ tool_input: { command }, cwd }), encoding: 'utf8', env });
}

function assertAsks(result) {
  assert.equal(result.status, 0);
  const output = JSON.parse(result.stdout);
  assert.equal(output.hookSpecificOutput.hookEventName, 'PreToolUse');
  assert.equal(output.hookSpecificOutput.permissionDecision, 'ask');
  assert.match(output.hookSpecificOutput.permissionDecisionReason, /Pratham's go-ahead/);
}

function assertSilent(result) {
  assert.equal(result.status, 0);
  assert.equal(result.stdout, '');
  assert.equal(result.stderr, '');
}

describe('confirm-main-writes hook', () => {
  const feature = repoOn('feature');
  const main = repoOn('main');

  test('asks before merging a PR', () => {
    assertAsks(run('gh pr merge 47 --squash', feature));
  });

  test('asks before pushing to main, however the target is written', () => {
    for (const command of [
      'git push origin main',
      'git push -f origin main',
      'git push --force-with-lease origin HEAD:main',
      'git push origin HEAD:refs/heads/main',
      'git push origin +main',
      'git status && git push origin main',
    ]) {
      assertAsks(run(command, feature));
    }
  });

  test('asks about a push with no refspec only while on main', () => {
    assertAsks(run('git push', main));
    assertAsks(run('git push origin HEAD', main));
    assertSilent(run('git push', feature));
    assertSilent(run('git push origin HEAD', feature));
  });

  test('uses the branch of the repo named by -C', () => {
    assertAsks(run(`git -C "${main}" push`, feature));
  });

  test('stays silent for other pushes and commands', () => {
    for (const command of [
      'git push origin feature-branch',
      'git push -u origin m1-retro-guardrails',
      'git push origin main-fixes',
      'git push origin main:feature',
      'git status',
      'gh pr view 47',
      'echo main',
    ]) {
      assertSilent(run(command, feature));
    }
  });

  test('stays silent inside a no-mistakes run', () => {
    assertSilent(run('git push origin main', feature, { NO_MISTAKES_GATE: '1' }));
  });
});
