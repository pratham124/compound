// Enforces CLAUDE.md "Where tests live": a test imports something from its own package, and never in apps/mobile/app/.
// Run from the repo root as part of `pnpm lint`.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { posix } from 'node:path';

const testName = /\.test\.(ts|tsx|mjs|js)$/;

const importSpecifier = /(?:\bfrom\s*|\bimport\s*\(\s*|\brequire\s*\(\s*|^\s*import\s+)['"]([^'"]+)['"]/gm;

function packageOf(file) {
  const parts = file.split('/');

  if (parts.length < 2) return '';

  return ['apps', 'packages', 'infra'].includes(parts[0]) && parts.length > 2 ? `${parts[0]}/${parts[1]}` : parts[0];
}

// The relative imports of a test, split by whether they land in the test's own package. A test may
// also pull a fixture from another package, so only a test with no import of its own package is misplaced.
function relativeImports(file) {
  const pkg = packageOf(file);

  const inside = [];

  const outside = [];

  for (const match of readFileSync(file, 'utf8').matchAll(importSpecifier)) {
    const specifier = match[1];

    if (!specifier.startsWith('./') && !specifier.startsWith('../')) continue;

    const target = posix.normalize(posix.join(posix.dirname(file), specifier));

    (pkg === '' || target.startsWith(`${pkg}/`) ? inside : outside).push(specifier);
  }

  return { inside, outside };
}

const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

const tracked = git('ls-files', '-z', '--cached', '--others', '--exclude-standard').split('\0');

// A staged deletion stays in the index while the file is gone from disk.
const files = tracked.filter((file) => file && existsSync(file));

const problems = [];

for (const file of files) {
  const isTest = testName.test(file) || file.split('/').includes('__tests__');

  if (!isTest) continue;

  if (file.startsWith('apps/mobile/app/')) {
    problems.push(`${file}: Expo Router turns every file in apps/mobile/app/ into a screen. Move the test under apps/mobile/src/ next to the logic it covers.`);
    continue;
  }

  const { inside, outside } = relativeImports(file);

  if (inside.length === 0 && outside.length > 0) {
    problems.push(`${file}: imports nothing from its own package (${packageOf(file)}), only ${outside.join(', ')}. Move the test into the package of the code it tests.`);
  }
}

if (problems.length > 0) {
  console.error(`Test placement problems (CLAUDE.md, "Where tests live"):\n${problems.map((p) => `  ${p}`).join('\n')}`);
  process.exit(1);
}
