// Tests the verification tooling through its CLIs, against throwaway git repos.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { after, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const script = (name) => join(here, name);
const hook = resolve(here, '..', '..', '.claude', 'hooks', 'require-no-mistakes.mjs');
const dirs = [];

after(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })));

const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

function write(repo, files) {
  for (const [path, content] of Object.entries(files)) {
    const full = join(repo, path);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, content);
  }
}

function commit(repo, files, message = 'change') {
  write(repo, files);
  git(repo, 'add', '-A');
  git(repo, 'commit', '-m', message);
}

// A repo with `main` holding one commit and `feature` checked out. withMain=false skips the main name.
function makeRepo({ withMain = true, files = {} } = {}) {
  const repo = resolve(mkdtempSync(join(tmpdir(), 'verif-')));
  dirs.push(repo);
  git(repo, 'init', '-b', withMain ? 'main' : 'trunk');
  git(repo, 'config', 'user.email', 't@example.com');
  git(repo, 'config', 'user.name', 'Test');
  git(repo, 'config', 'core.autocrlf', 'false');
  commit(repo, { 'README.md': 'x', ...files }, 'base');
  git(repo, 'checkout', '-b', 'feature');

  return repo;
}

function run(name, repo) {
  const findingsFile = join(repo, '..', `findings-${Math.random().toString(36).slice(2)}.json`);
  writeFileSync(findingsFile, '');
  dirs.push(findingsFile);

  const result = spawnSync('node', [script(name)], {
    cwd: repo,
    encoding: 'utf8',
    env: { ...process.env, NO_MISTAKES_FINDINGS_FILE: findingsFile },
  });

  const text = readFileSync(findingsFile, 'utf8');

  return { ...result, findings: text ? JSON.parse(text).findings : [] };
}

const verifySkill = { '.claude/skills/verify-compound/SKILL.md': 'skill', '.claude/skills/verify-compound/features/log.md': 'old' };

describe('pipeline-skips', () => {
  test('docs-only change prints test', () => {
    const repo = makeRepo();
    commit(repo, { 'docs/a.md': 'a', '.claude/x.json': '{}' });
    assert.equal(run('pipeline-skips.mjs', repo).stdout.trim(), 'test');
  });

  test('app change prints nothing', () => {
    const repo = makeRepo();
    commit(repo, { 'docs/a.md': 'a', 'app/index.ts': 'x' });
    const result = run('pipeline-skips.mjs', repo);
    assert.equal(result.stdout.trim(), '');
    assert.equal(result.status, 0);
  });
});

describe('check-sync', () => {
  test('passes with no verify skill', () => {
    const repo = makeRepo();
    commit(repo, { 'app/index.ts': 'x' });
    const result = run('check-sync.mjs', repo);
    assert.equal(result.status, 0);
    assert.deepEqual(result.findings, []);
  });

  test('app change without map change is an error', () => {
    const repo = makeRepo({ files: verifySkill });
    commit(repo, { 'app/index.ts': 'x' });
    const result = run('check-sync.mjs', repo);
    assert.equal(result.findings.length, 1);
    assert.equal(result.findings[0].severity, 'error');
    assert.equal(result.findings[0].action, 'ask-user');
    assert.match(result.findings[0].description, /feature-map/);
  });

  test('app change with map change passes', () => {
    const repo = makeRepo({ files: verifySkill });
    commit(repo, { 'app/index.ts': 'x', '.claude/skills/verify-compound/features/log.md': 'new' });
    assert.deepEqual(run('check-sync.mjs', repo).findings, []);
  });

  test('covered path changed without skill change is an error', () => {
    const repo = makeRepo({ files: { '.claude/skills/formal-sync/SKILL.md': 's', '.claude/skills/formal-sync/covers.txt': '# sync\nsrc/sync\n' } });
    commit(repo, { 'src/sync/a.ts': 'x' });
    const result = run('check-sync.mjs', repo);
    assert.equal(result.findings.length, 1);
    assert.equal(result.findings[0].severity, 'error');
    assert.match(result.findings[0].description, /formal-sync/);
  });

  test('covered path changed with skill change passes', () => {
    const repo = makeRepo({ files: { '.claude/skills/formal-sync/covers.txt': 'src/sync\n' } });
    commit(repo, { 'src/sync/a.ts': 'x', '.claude/skills/formal-sync/SKILL.md': 's' });
    assert.deepEqual(run('check-sync.mjs', repo).findings, []);
  });

  test('escape line in a commit message passes', () => {
    const repo = makeRepo({ files: verifySkill });
    commit(repo, { 'app/index.ts': 'x' }, 'Refactor\n\nNo verification update: identical behavior');
    const result = run('check-sync.mjs', repo);
    assert.equal(result.status, 0);
    assert.deepEqual(result.findings, []);
  });

  test('no base ref gives a warning only', () => {
    const repo = makeRepo({ withMain: false, files: verifySkill });
    commit(repo, { 'app/index.ts': 'x' });
    const result = run('check-sync.mjs', repo);
    assert.equal(result.status, 0);
    assert.equal(result.findings.length, 1);
    assert.equal(result.findings[0].severity, 'warning');
  });

  test('uses origin/main when present', () => {
    const repo = makeRepo({ files: verifySkill });
    git(repo, 'update-ref', 'refs/remotes/origin/main', 'main');
    git(repo, 'branch', '-f', 'main', 'HEAD'); // local main moves ahead, so only origin/main shows the change
    commit(repo, { 'app/index.ts': 'x' });
    const result = run('check-sync.mjs', repo);
    assert.equal(result.findings.length, 1);
    assert.equal(result.findings[0].severity, 'error');
  });
});

describe('run-formal', () => {
  const formal = (check) => {
    const files = { '.claude/skills/formal-sync/covers.txt': 'src/sync\n' };

    if (check !== undefined) {
      files['.claude/skills/formal-sync/check.txt'] = `# runs the model\n${check}\n`;
    }

    return files;
  };

  test('failing check is an error naming the skill', () => {
    const repo = makeRepo({ files: formal('node -e "console.log(\'boom\'); process.exit(1)"') });
    commit(repo, { 'src/sync/a.ts': 'x' });
    const result = run('run-formal.mjs', repo);
    assert.equal(result.findings.length, 1);
    assert.equal(result.findings[0].severity, 'error');
    assert.match(result.findings[0].description, /formal-sync/);
    assert.match(result.findings[0].description, /boom/);
  });

  test('passing check reports nothing', () => {
    const repo = makeRepo({ files: formal('node -e "process.exit(0)"') });
    commit(repo, { 'src/sync/a.ts': 'x' });
    const result = run('run-formal.mjs', repo);
    assert.equal(result.status, 0);
    assert.deepEqual(result.findings, []);
  });

  test('covers.txt without check.txt is an error', () => {
    const repo = makeRepo({ files: formal(undefined) });
    commit(repo, { 'src/sync/a.ts': 'x' });
    const result = run('run-formal.mjs', repo);
    assert.equal(result.findings.length, 1);
    assert.match(result.findings[0].description, /check\.txt/);
  });

  test('uncovered change runs nothing', () => {
    const repo = makeRepo({ files: formal('node -e "process.exit(1)"') });
    commit(repo, { 'src/other/a.ts': 'x' });
    assert.deepEqual(run('run-formal.mjs', repo).findings, []);
  });
});

describe('require-no-mistakes hook', () => {
  // Strip NO_MISTAKES_GATE so these tests behave the same inside a no-mistakes run.
  const { NO_MISTAKES_GATE: _, ...cleanEnv } = process.env;

  const runHook = (command, cwd = here, env = cleanEnv) =>
    spawnSync('node', [hook], { input: JSON.stringify({ tool_input: { command }, cwd }), encoding: 'utf8', env });

  test('never blocks agents running inside a no-mistakes pipeline', () => {
    assert.equal(runHook('gh pr create --title t --body b', here, { ...cleanEnv, NO_MISTAKES_GATE: '1' }).status, 0);
  });

  test('blocks gh pr create', () => {
    const result = runHook('gh pr create --title t --body b');
    assert.equal(result.status, 2);
    assert.match(result.stderr, /no-mistakes/);
  });

  test('allows it with a skip reason', () => {
    assert.equal(runHook('gh pr create --body "Skipped no-mistakes: hotfix"').status, 0);
  });

  test('reads the skip reason from --body-file', () => {
    const dir = mkdtempSync(join(tmpdir(), 'hook-'));
    dirs.push(dir);
    writeFileSync(join(dir, 'body.md'), 'Skipped no-mistakes: docs typo\n');
    assert.equal(runHook('gh pr create --body-file body.md', dir).status, 0);
    assert.ok(existsSync(join(dir, 'body.md')));
  });

  test('ignores other commands', () => {
    assert.equal(runHook('git status').status, 0);
  });
});
