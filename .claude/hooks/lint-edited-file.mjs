// PostToolUse hook: lint the one file that was just edited with the repo's oxlint config, so
// problems come back to the agent right away instead of at `pnpm lint` or CI. Exit 2 sends stderr to Claude.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const input = JSON.parse(readFileSync(0, 'utf8'));
const filePath = input.tool_input?.file_path ?? '';
if (!/\.(ts|tsx|mjs|js|cjs)$/.test(filePath)) process.exit(0);

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const file = resolve(input.cwd || process.cwd(), filePath);
const rel = relative(root, file);
if (rel.startsWith('..') || isAbsolute(rel)) process.exit(0);

// Windows only has the .cmd shim, and spawning a .cmd needs a shell.
const windows = process.platform === 'win32';
const bin = join(root, 'node_modules', '.bin', windows ? 'oxlint.cmd' : 'oxlint');
const result = spawnSync(bin, ['--deny-warnings', rel], { cwd: root, encoding: 'utf8', shell: windows });
if (result.status === 0) process.exit(0);

console.error(`oxlint reports problems in ${rel}:\n${result.stdout}${result.stderr}`);
process.exit(2);
