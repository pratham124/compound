import { dateLineFor } from '../today/greeting.ts';

const msPerMinute = 60_000;

/** "Under 1 min", "45 min" or "1 h 35 min". An unfinished workout counts as zero. */
export function durationText({ startedAt, finishedAt }: { startedAt: number; finishedAt: number | null }): string {
  const minutes = Math.max(0, Math.floor(((finishedAt ?? startedAt) - startedAt) / msPerMinute));

  if (minutes < 1) {
    return 'Under 1 min';
  }

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  if (hours === 0) {
    return `${minutes} min`;
  }

  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

export function workoutDateText(startedAt: number, now: Date = new Date()): string {
  const started = new Date(startedAt);
  const line = dateLineFor(started);

  return started.getFullYear() === now.getFullYear() ? line : `${line} ${started.getFullYear()}`;
}
