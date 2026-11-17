import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { after, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const hook = join(here, 'lint-edited-file.mjs');
const root = resolve(here, '..', '..');
// .claude/ is in the oxlint ignore list, so fixtures live in a scratch folder elsewhere in the repo.
const scratch = mkdtempSync(join(root, 'scripts', 'lint-hook-'));
const outside = mkdtempSync(join(tmpdir(), 'lint-hook-'));

after(() => {
  rmSync(scratch, { recursive: true, force: true });
  rmSync(outside, { recursive: true, force: true });
});

function edited(dir, name, content) {
  const file = join(dir, name);
  writeFileSync(file, content);
  return spawnSync('node', [hook], { input: JSON.stringify({ tool_input: { file_path: file }, cwd: root }), encoding: 'utf8' });
}

const crowded = 'const a = 1;\nconst b = 2;\nexport { a, b };\n';
const spaced = 'const a = 1;\n\nconst b = 2;\n\nexport { a, b };\n';

describe('lint-edited-file hook', () => {
  test('blocks with the rule name when the edited file breaks the repo config', () => {
    const result = edited(scratch, 'crowded.mjs', crowded);
    assert.equal(result.status, 2);
    assert.match(result.stderr, /require-readable-spacing/);
  });

  test('passes a clean file', () => {
    const result = edited(scratch, 'spaced.mjs', spaced);
    assert.equal(result.status, 0);
    assert.equal(result.stderr, '');
  });

  test('ignores a file type oxlint does not cover', () => {
    assert.equal(edited(scratch, 'notes.md', crowded).status, 0);
  });

  test('ignores a file outside the project', () => {
    assert.equal(edited(outside, 'crowded.mjs', crowded).status, 0);
  });
});
