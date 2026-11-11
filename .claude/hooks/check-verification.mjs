// PreToolUse hook: blocks `gh pr create` when the PR changes code that a
// verification skill describes without updating that skill. Rules: CLAUDE.md,
// "Keep verification in step with the code". Exit 2 blocks; stderr goes to Claude.
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const input = JSON.parse(readFileSync(0, 'utf8'));
const command = input.tool_input?.command ?? '';
if (!/\bgh\s+pr\s+create\b/.test(command)) process.exit(0);

const cwd = input.cwd || process.cwd();
const git = (...args) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();

let body = command;
const bodyFile = command.match(/--body-file[=\s]+("([^"]+)"|'([^']+)'|(\S+))/);
if (bodyFile) {
  const path = bodyFile[2] ?? bodyFile[3] ?? bodyFile[4];
  try { body += readFileSync(join(cwd, path), 'utf8'); } catch {}
}
if (/No verification update:\s*\S/.test(body)) process.exit(0);

let changed;
let root;
try {
  root = git('rev-parse', '--show-toplevel');
  const base = git('merge-base', 'HEAD', 'origin/main');
  changed = git('diff', '--name-only', base, 'HEAD').split('\n').filter(Boolean);
} catch {
  process.exit(0); // not a repo or no origin/main: nothing to check against
}

const skillsDir = join(root, '.claude', 'skills');
const skills = existsSync(skillsDir) ? readdirSync(skillsDir) : [];
const touched = (dir) => changed.some((f) => f.startsWith(`.claude/skills/${dir}/`));
const problems = [];

// App verification: any change outside docs and tooling counts as app code.
const notApp = /^(docs\/|\.claude\/|\.github\/|spike\/)|\.md$/;
const appFiles = changed.filter((f) => !notApp.test(f));
const verifySkills = skills.filter((s) => s.startsWith('verify-'));
if (appFiles.length && verifySkills.length && !verifySkills.some(touched)) {
  problems.push(
    `App code changed (${appFiles.slice(0, 5).join(', ')}${appFiles.length > 5 ? ', ...' : ''}) ` +
      `but no feature-map file under .claude/skills/${verifySkills.join(' or ')}/ did. ` +
      'Follow maintain-verification-skill for the touched features.',
  );
}

// Formal verification: a covered path changed but its skill didn't.
for (const skill of skills) {
  const coversPath = join(skillsDir, skill, 'covers.txt');
  if (!existsSync(coversPath)) continue;
  const covers = readFileSync(coversPath, 'utf8')
    .split('\n')
    .map((l) => l.replace(/#.*/, '').trim())
    .filter(Boolean);
  const hits = changed.filter((f) => covers.some((c) => f === c || f.startsWith(c.endsWith('/') ? c : `${c}/`)));
  if (hits.length && !touched(skill)) {
    problems.push(
      `Code covered by the formal check "${skill}" changed (${hits.join(', ')}) but the skill didn't. ` +
        'Follow maintain-formal-verification-skill: update the model or harness and the sync commit, and rerun it.',
    );
  }
}

if (problems.length) {
  console.error(
    `PR blocked: verification would fall behind the code.\n- ${problems.join('\n- ')}\n` +
      'If this PR really changes nothing a check describes, add a line starting "No verification update:" with the reason to the PR body.',
  );
  process.exit(2);
}
