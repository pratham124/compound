// Runs the check against throwaway git repos.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { after, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const script = join(dirname(fileURLToPath(import.meta.url)), 'check-test-placement.mjs');
const dirs = [];

after(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })));

// The check scans source text for imports, so fixtures are assembled from pieces to keep this file's own text free of them.
const fromImport = (specifier) => `import x ${'fr'}${'om'} '${specifier}';\n`;
const dynamicImport = (specifier) => `await ${'im'}${'port'}('${specifier}');\n`;
const requireCall = (specifier) => `${'re'}${'quire'}('${specifier}');\n`;

// Files are written untracked unless listed in `staged`; the check must count both.
function check(files, staged = []) {
  const repo = resolve(mkdtempSync(join(tmpdir(), 'placement-')));

  dirs.push(repo);

  execFileSync('git', ['init', '-b', 'main'], { cwd: repo, stdio: 'ignore' });

  for (const [path, content] of Object.entries(files)) {
    const full = join(repo, path);

    mkdirSync(dirname(full), { recursive: true });

    writeFileSync(full, content);
  }

  for (const path of staged) execFileSync('git', ['add', path], { cwd: repo });

  return spawnSync('node', [script], { cwd: repo, encoding: 'utf8' });
}

describe('check-test-placement', () => {
  test('fails a test importing from another package, as the misplaced ticker test did', () => {
    const result = check({ 'apps/server/src/x.test.ts': fromImport('../../../infra/local/ticker') });

    assert.equal(result.status, 1);
    assert.match(result.stderr, /apps\/server\/src\/x\.test\.ts/);
    assert.match(result.stderr, /infra\/local\/ticker/);
  });

  test('catches a package escape through import(), require() and a bare ../ path', () => {
    const result = check({
      'apps/server/src/a.test.ts': dynamicImport('../../mobile/src/b.ts'),
      'packages/contracts/src/c.test.ts': requireCall('../../../apps/server/src/d.ts'),
      'scripts/e.test.mjs': fromImport('../apps/server/src/f.ts'),
      'apps/server/src/g.test.ts': fromImport('../../server-tools/h.ts'),
    });

    assert.equal(result.status, 1);
    assert.match(result.stderr, /apps\/server\/src\/a\.test\.ts/);
    assert.match(result.stderr, /packages\/contracts\/src\/c\.test\.ts/);
    assert.match(result.stderr, /scripts\/e\.test\.mjs/);
    assert.match(result.stderr, /apps\/server\/src\/g\.test\.ts/);
  });

  test('passes imports that stay inside the package, including ../ paths', () => {
    const result = check({
      'apps/mobile/src/navigation/shell.test.tsx': fromImport('../../app/_layout.tsx') + fromImport('../auth/AuthClientContext.tsx'),
      'apps/server/src/identity/signIn.test.ts': fromImport('./testkit.ts'),
      'infra/local/tick.test.ts': fromImport('./tick.ts'),
      'scripts/verification/v.test.mjs': fromImport('../helper.mjs'),
    });

    assert.equal(result.status, 0, result.stderr);
  });

  test('passes a test that imports its own package plus a fixture from another package', () => {
    const result = check({ 'apps/server/src/worker.test.ts': fromImport('./worker.ts') + fromImport('../../../infra/local/tick-body.ts') });

    assert.equal(result.status, 0, result.stderr);
  });

  test('passes a test with no relative imports', () => {
    const result = check({ 'apps/server/src/y.test.ts': fromImport('node:test') + fromImport('pg') });

    assert.equal(result.status, 0, result.stderr);
  });

  test('lists every offender, not just the first', () => {
    const result = check({ 'scripts/one.test.mjs': fromImport('../x/a.ts'), 'loadtest/two.test.mjs': fromImport('../scripts/b.ts') });

    assert.equal(result.status, 1);
    assert.match(result.stderr, /scripts\/one\.test\.mjs/);
    assert.match(result.stderr, /loadtest\/two\.test\.mjs/);
  });

  test('rejects any test file under apps/mobile/app/, even one with no imports', () => {
    const result = check({ 'apps/mobile/app/index.test.tsx': '', 'apps/mobile/app/__tests__/index.ts': '' });

    assert.equal(result.status, 1);
    assert.match(result.stderr, /apps\/mobile\/app\/index\.test\.tsx/);
    assert.match(result.stderr, /apps\/mobile\/app\/__tests__\/index\.ts/);
  });

  test('counts a staged test and an untracked one alike', () => {
    const result = check({ 'apps/a/x.test.ts': fromImport('../../b/y'), 'apps/c/z.test.ts': fromImport('../../b/y') }, ['apps/a/x.test.ts']);

    assert.match(result.stderr, /apps\/a\/x\.test\.ts/);
    assert.match(result.stderr, /apps\/c\/z\.test\.ts/);
  });
});
