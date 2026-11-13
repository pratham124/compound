// PreToolUse hook: the main checkout stays on main, because other panes and sessions work there
// and edits on it would change files under them. So Edit/Write/NotebookEdit on a file git would
// track in the main checkout is blocked. Allowed: linked worktrees, gitignored files
// (docs/tradeoffs.md, docs/diagrams/ live only in the main checkout), and other repos.
// Exit 2 blocks; stderr goes to Claude.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const input = JSON.parse(readFileSync(0, 'utf8'));
// Agents that no-mistakes runs inside a pipeline load this repo's hooks too; never block the pipeline itself.
if (process.env.NO_MISTAKES_GATE) process.exit(0);

const target = input.tool_input?.file_path ?? input.tool_input?.notebook_path;
if (!target) process.exit(0);
const cwd = input.cwd || process.cwd();
const file = resolve(cwd, target);

// A new file can sit in a folder that doesn't exist yet; ask git from its nearest existing parent.
let dir = dirname(file);
while (!existsSync(dir)) {
  const parent = dirname(dir);
  if (parent === dir) process.exit(0);
  dir = parent;
}

const git = (from, ...args) =>
  spawnSync('git', ['-C', from, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });

const where = git(dir, 'rev-parse', '--path-format=absolute', '--git-dir', '--git-common-dir');
if (where.status !== 0) process.exit(0); // not in a git repo
const [gitDir, commonDir] = where.stdout.trim().split('\n');
if (gitDir !== commonDir) process.exit(0); // a linked worktree

const project = git(process.env.CLAUDE_PROJECT_DIR || cwd, 'rev-parse', '--path-format=absolute', '--git-common-dir');
if (project.status !== 0 || project.stdout.trim() !== commonDir) process.exit(0); // another repo's main checkout

if (git(dir, 'check-ignore', '-q', file).status === 0) process.exit(0); // gitignored

console.error(
  `Edit blocked: ${file} is in the main checkout, which stays on main so other sessions' files don't change under them.\n` +
    'Start a worktree first: /ticket <n> for an issue, or the feature-worktree skill for other work. Then edit the copy of this file inside the worktree.\n' +
    'Gitignored files (docs/tradeoffs.md, docs/diagrams/) are allowed in the main checkout.',
);
process.exit(2);
