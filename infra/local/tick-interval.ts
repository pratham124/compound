const DEFAULT_SECONDS = 10;

/** Runs in a bare container with no node_modules, so this is checked by hand rather than with zod. */
export function parseIntervalSeconds(raw: string | undefined): number {
  if (raw === undefined) {
    return DEFAULT_SECONDS;
  }

  const seconds = Number(raw);

  if (!Number.isInteger(seconds) || seconds < 1) {
    throw new Error(`TICK_INTERVAL_SECONDS must be a whole number of seconds, 1 or more. Got "${raw}".`);
  }

  return seconds;
}
