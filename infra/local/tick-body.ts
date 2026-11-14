export function buildTickBody(now: Date): string {
  return JSON.stringify({ kind: 'test', sentAt: now.toISOString() });
}
