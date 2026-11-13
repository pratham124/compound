// Shared helpers for the verification gates: which files this branch changed,
// and whether the change is docs/tooling only.
import { execFileSync } from 'node:child_process';

const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();

export function baseRef(cwd) {
  const exists = (ref) => {
    try {
      git(cwd, 'rev-parse', '--verify', '--quiet', ref);

      return true;
    } catch {
      return false;
    }
  };

  for (const ref of ['origin/main', 'main']) if (exists(ref)) return ref;

  try {
    const remotes = git(cwd, 'for-each-ref', '--format=%(refname)', 'refs/remotes/*/main').split('\n').filter(Boolean);

    return remotes.find(exists) ?? null;
  } catch { return null; }
}

export function mergeBase(cwd) {
  const ref = baseRef(cwd);

  if (!ref) return null;

  try { return git(cwd, 'merge-base', 'HEAD', ref); } catch { return null; }
}

// Repo-relative paths changed between the merge-base with main and HEAD, or null if no base.
export function changedFiles(cwd) {
  const base = mergeBase(cwd);

  if (!base) return null;

  return git(cwd, 'diff', '--name-only', base, 'HEAD').split('\n').filter(Boolean);
}

const notAppPattern = /^(docs\/|\.claude\/|\.github\/|spike\/)|\.md$/;
export const isApp = (file) => !notAppPattern.test(file);
export const isDocsOnly = (files) => files.length > 0 && files.every((f) => !isApp(f));
