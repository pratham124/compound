import { dateLineFor } from '../today/greeting.ts';

const msPerMinute = 60_000;

function minutesText(minutes: number) {
  return minutes === 1 ? '1 min' : `${minutes} mins`;
}

/** "Under 1 min", "1 min", "45 mins" or "1 h 35 mins". An unfinished workout counts as zero. */
export function durationText({ startedAt, finishedAt }: { startedAt: number; finishedAt: number | null }): string {
  const minutes = Math.max(0, Math.floor(((finishedAt ?? startedAt) - startedAt) / msPerMinute));

  if (minutes < 1) {
    return 'Under 1 min';
  }

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  if (hours === 0) {
    return minutesText(minutes);
  }

  return rest === 0 ? `${hours} h` : `${hours} h ${minutesText(rest)}`;
}

export function workoutDateText(startedAt: number, now: Date = new Date()): string {
  const started = new Date(startedAt);
  const line = dateLineFor(started);

  return started.getFullYear() === now.getFullYear() ? line : `${line} ${started.getFullYear()}`;
}
