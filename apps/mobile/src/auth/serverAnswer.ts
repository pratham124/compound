export type ServerAnswer = { status: 'ok' } | { status: 'refused' } | { status: 'rate-limited' } | { status: 'error' };

export function answerFrom({ error }: { error: { status: number } | null }): ServerAnswer {
  if (error === null) {
    return { status: 'ok' };
  }

  if (error.status === 429) {
    return { status: 'rate-limited' };
  }

  return error.status >= 400 && error.status < 500 ? { status: 'refused' } : { status: 'error' };
}
