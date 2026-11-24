import { SyncBatchResults, type SyncChange } from '@compound/contracts';

import type { UploadResult } from './syncRunner.ts';

export type UploadRequest = {
  baseUrl: string | undefined;
  cookie: string;
  fetch: typeof globalThis.fetch;
  timeoutMs: number;
  changes: SyncChange[];
  signal: AbortSignal;
};

/** Any answer but 200 or 401 throws, so the runner keeps the rows and retries. */
export async function uploadChanges({ baseUrl, cookie, fetch, timeoutMs, changes, signal }: UploadRequest): Promise<UploadResult> {
  if (baseUrl === undefined || baseUrl === '') {
    throw new Error('EXPO_PUBLIC_API_URL is not set');
  }

  // An abort listener added after the signal fired never runs.
  if (signal.aborted) {
    throw new Error('The upload was stopped before it was sent');
  }

  const controller = new AbortController();
  const abort = () => controller.abort();
  const timer = setTimeout(abort, timeoutMs);

  signal.addEventListener('abort', abort);

  try {
    const response = await fetch(new URL('/sync/changes', baseUrl).href, {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ changes }),
      signal: controller.signal,
    });

    if (response.status === 401) {
      return { status: 'unauthenticated' };
    }

    if (!response.ok) {
      throw new Error(`The server answered ${response.status}`);
    }

    const body: unknown = JSON.parse(await response.text());

    return { status: 'uploaded', outcomes: SyncBatchResults.parse(body).results };
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', abort);
  }
}
