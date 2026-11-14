import { HealthResponse } from '@compound/contracts';

export type FetchHealthOptions = {
  baseUrl: string;
  fetch: typeof globalThis.fetch;
};

export async function fetchHealth({ baseUrl, fetch }: FetchHealthOptions): Promise<HealthResponse> {
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/health`);
  const body: unknown = JSON.parse(await response.text());

  return HealthResponse.parse(body);
}
