// PreToolUse hook: merging a PR or pushing to main needs Pratham's go-ahead each time, so these
// commands ask instead of running. Anything else exits 0 silently.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const input = JSON.parse(readFileSync(0, 'utf8'));
const command = input.tool_input?.command ?? '';
// no-mistakes only pushes the PR branch and never merges, but its agents load this repo's hooks too.
if (process.env.NO_MISTAKES_GATE) process.exit(0);

const cwd = input.cwd || process.cwd();

function currentBranch(dir) {
  try {
    return execFileSync('git', ['-C', dir, 'branch', '--show-current'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

const isMain = (ref) => /^(\+?refs\/heads\/|\+)?main$/.test(ref);

function pushesToMain(args, dir) {
  const positional = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--repo' || arg === '-o' || arg === '--push-option' || arg === '--receive-pack' || arg === '--exec') i++;
    else if (!arg.startsWith('-')) positional.push(arg);
  }
  const refspecs = positional.slice(1);
  if (refspecs.length === 0) return currentBranch(dir) === 'main';
  return refspecs.some((spec) => {
    const dest = spec.includes(':') ? spec.slice(spec.lastIndexOf(':') + 1) : spec;
    return dest === 'HEAD' ? currentBranch(dir) === 'main' : isMain(dest);
  });
}

function actionFor(segment) {
  const tokens = segment.trim().split(/\s+/).map((t) => t.replace(/^["']|["']$/g, ''));
  while (tokens[0] && /^\w+=/.test(tokens[0])) tokens.shift();
  if (tokens[0] === 'gh' && tokens[1] === 'pr' && tokens[2] === 'merge') return 'merging a PR';
  if (tokens[0] !== 'git') return null;

  let dir = cwd;
  let i = 1;
  while (i < tokens.length && tokens[i].startsWith('-')) {
    if (tokens[i] === '-C' && tokens[i + 1]) dir = tokens[++i];
    i++;
  }
  if (tokens[i] !== 'push') return null;
  return pushesToMain(tokens.slice(i + 1), dir) ? 'pushing to main' : null;
}

for (const segment of command.split(/&&|\|\||;|\||\n/)) {
  const action = actionFor(segment);
  if (!action) continue;
  console.log(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'ask',
        permissionDecisionReason: `Merging or pushing to main needs Pratham's go-ahead each time (${action}). An agent merged #46 and pushed to main unasked in M1.`,
      },
    }),
  );
  process.exit(0);
}
