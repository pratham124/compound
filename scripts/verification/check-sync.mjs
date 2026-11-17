// Gate `verification-sync`: verification skills must change with the code they describe.
// Rules: docs/agents/verification.md.
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { changedFiles, isApp, mergeBase } from './changed-files.mjs';
import { report } from './report.mjs';

const cwd = process.cwd();
const changed = changedFiles(cwd);

if (changed === null) {
  report([{ id: 'no-base', severity: 'warning', description: 'No main branch found to compare against, so verification sync was not checked.' }]);
  process.exit(0);
}

// The PR body isn't visible to a gate, so the escape lives in a commit message.
const messages = execFileSync('git', ['log', `${mergeBase(cwd)}..HEAD`, '--format=%B'], { cwd, encoding: 'utf8' });

if (/^No verification update:\s*\S/m.test(messages)) process.exit(0);

const skillsDir = join(cwd, '.claude', 'skills');
const skills = existsSync(skillsDir) ? readdirSync(skillsDir) : [];
const touched = (dir) => changed.some((f) => f.startsWith(`.claude/skills/${dir}/`));
const findings = [];

const verifySkills = skills.filter((s) => s.startsWith('verify-'));
const appFiles = changed.filter(isApp);

if (appFiles.length && verifySkills.length && !verifySkills.some(touched)) {
  findings.push({
    id: 'app-map-stale',
    severity: 'error',
    action: 'ask-user',
    description:
      `App code changed (${appFiles.slice(0, 5).join(', ')}${appFiles.length > 5 ? ', ...' : ''}) but no feature-map file under ` +
      `.claude/skills/${verifySkills.join(' or ')}/features/ did. Create or update the file for each touched feature, ` +
      'or add a commit message line "No verification update: <reason>".',
  });
}

const readList = (path) => readFileSync(path, 'utf8').split('\n').map((l) => l.replace(/#.*/, '').trim()).filter(Boolean);
const matches = (list) => changed.filter((f) => list.some((c) => f === c || f.startsWith(c.endsWith('/') ? c : `${c}/`)));

// A verify skill's SKILL.md and scripts name ports, services, env, start commands and labels. depends.txt lists the
// files those come from. features/ is left out because the app-map-stale check above already guards the feature map,
// and depends.txt itself is left out so editing the list alone can't satisfy the gate.
const touchedBeyondMap = (skill) =>
  changed.some((f) => f.startsWith(`.claude/skills/${skill}/`) && !f.startsWith(`.claude/skills/${skill}/features/`) && f !== `.claude/skills/${skill}/depends.txt`);

for (const skill of skills) {
  const dependsPath = join(skillsDir, skill, 'depends.txt');

  if (existsSync(dependsPath)) {
    const dependsHits = matches(readList(dependsPath));

    if (dependsHits.length && !touchedBeyondMap(skill)) {
      findings.push({
        id: `skill-stale-${skill}`,
        severity: 'error',
        action: 'ask-user',
        file: `.claude/skills/${skill}/depends.txt`,
        description:
          `Files the verify skill "${skill}" depends on changed (${dependsHits.slice(0, 5).join(', ')}${dependsHits.length > 5 ? ', ...' : ''}) but its SKILL.md and scripts didn't. ` +
          'Check its Launch, Doctor, Drive, Evidence and Cleanup sections and scripts against the change (ports, services, env, start commands, labels), ' +
          'or add a commit message line "No verification update: <reason>".',
      });
    }
  }

  const coversPath = join(skillsDir, skill, 'covers.txt');

  if (!existsSync(coversPath)) continue;
  const hits = matches(readList(coversPath));

  if (hits.length && !touched(skill)) {
    findings.push({
      id: `formal-stale-${skill}`,
      severity: 'error',
      action: 'ask-user',
      file: `.claude/skills/${skill}/covers.txt`,
      description:
        `Code covered by the formal check "${skill}" changed (${hits.join(', ')}) but the skill didn't. ` +
        'Follow maintain-formal-verification-skill: update the model or harness and the sync commit, and rerun it, ' +
        'or add a commit message line "No verification update: <reason>".',
    });
  }
}

report(findings);
