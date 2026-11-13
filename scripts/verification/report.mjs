// Writes a gate's findings report ({"findings": [...]}) to NO_MISTAKES_FINDINGS_FILE.
// Without that env var (manual run), prints the findings to stderr instead.
import { writeFileSync } from 'node:fs';

export function report(findings) {
  if (findings.length === 0) return;
  const file = process.env.NO_MISTAKES_FINDINGS_FILE;

  if (!file) {
    console.error(findings.map((f) => `${f.severity}: ${f.description}`).join('\n'));

    return;
  }

  writeFileSync(file, JSON.stringify({ findings }));
}
