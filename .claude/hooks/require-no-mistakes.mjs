// PreToolUse hook: PRs go through /no-mistakes, so `gh pr create` is blocked unless the
// body says why it was skipped. Exit 2 blocks; stderr goes to Claude.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const input = JSON.parse(readFileSync(0, 'utf8'));
const command = input.tool_input?.command ?? '';
if (!/\bgh\s+pr\s+create\b/.test(command)) process.exit(0);
// Agents that no-mistakes runs inside a pipeline load this repo's hooks too; never block the pipeline itself.
if (process.env.NO_MISTAKES_GATE) process.exit(0);

const cwd = input.cwd || process.cwd();
let body = command;
const bodyFile = command.match(/--body-file[=\s]+("([^"]+)"|'([^']+)'|(\S+))/);
if (bodyFile) {
  const path = bodyFile[2] ?? bodyFile[3] ?? bodyFile[4];
  try { body += readFileSync(join(cwd, path), 'utf8'); } catch {}
}
if (/Skipped no-mistakes:\s*\S/.test(body)) process.exit(0);

console.error(
  'PR blocked: PRs go through /no-mistakes so review, live verification and the verification gates run.\n' +
    'To bypass, include a line "Skipped no-mistakes: <reason>" in the PR body (inline --body or --body-file).',
);
process.exit(2);
