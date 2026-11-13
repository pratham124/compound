// Gate `formal-checks`: run each formal check whose covered code changed.
// A skill's `check.txt` holds the command (first non-comment line), run from the repo root.
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { changedFiles } from './changed-files.mjs';
import { report } from './report.mjs';

const cwd = process.cwd();
const changed = changedFiles(cwd);

if (changed === null) {
  report([{ id: 'no-base', severity: 'warning', description: 'No main branch found to compare against, so formal checks were not run.' }]);
  process.exit(0);
}

const lines = (path) => readFileSync(path, 'utf8').split('\n').map((l) => l.replace(/#.*/, '').trim()).filter(Boolean);
const skillsDir = join(cwd, '.claude', 'skills');
const findings = [];

for (const skill of existsSync(skillsDir) ? readdirSync(skillsDir) : []) {
  const coversPath = join(skillsDir, skill, 'covers.txt');

  if (!existsSync(coversPath)) continue;
  const covers = lines(coversPath);

  if (!changed.some((f) => covers.some((c) => f === c || f.startsWith(c.endsWith('/') ? c : `${c}/`)))) continue;

  const checkPath = join(skillsDir, skill, 'check.txt');
  const command = existsSync(checkPath) ? lines(checkPath)[0] : undefined;

  if (!command) {
    findings.push({
      id: `formal-no-check-${skill}`,
      severity: 'error',
      action: 'ask-user',
      description: `Formal check "${skill}" has covers.txt but no command in check.txt. Add one command that runs the check from the repo root.`,
    });
    continue;
  }

  const run = spawnSync(command, { cwd, shell: true, encoding: 'utf8' });

  if (run.status !== 0) {
    const tail = `${run.stdout ?? ''}${run.stderr ?? ''}`.trimEnd().split('\n').slice(-40).join('\n');
    findings.push({
      id: `formal-failed-${skill}`,
      severity: 'error',
      action: 'ask-user',
      description: `Formal check "${skill}" failed (\`${command}\`, exit ${run.status ?? run.signal}). It may be a real bug, so don't edit the property to match.\n${tail}`,
    });
  }
}

report(findings);
