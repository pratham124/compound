import { Profile, type TimeZone, type Units } from '@compound/contracts';

export type ProfileRequest = {
  baseUrl: string | undefined;
  cookie: string;
  fetch: typeof globalThis.fetch;
  timeoutMs: number;
};

function requireBaseUrl(baseUrl: string | undefined): string {
  if (baseUrl === undefined || baseUrl === '') {
    throw new Error('EXPO_PUBLIC_API_URL is not set');
  }

  return baseUrl;
}

/** AbortSignal.timeout isn't available on every React Native runtime, so this is the same timer loadServerStatus uses. */
async function requestProfile({ fetch, timeoutMs }: Pick<ProfileRequest, 'fetch' | 'timeoutMs'>, url: string, init: RequestInit) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { ...init, signal: controller.signal });

    if (!response.ok) {
      throw new Error(`The server answered ${response.status}`);
    }

    const body: unknown = JSON.parse(await response.text());

    return Profile.parse(body);
  } finally {
    clearTimeout(timer);
  }
}

/** The server creates the profile on first ask, using this phone's time zone. */
export async function fetchProfile({ baseUrl, cookie, fetch, timeoutMs, timeZone }: ProfileRequest & { timeZone: TimeZone | undefined }) {
  const url = new URL('/me/profile', requireBaseUrl(baseUrl));

  if (timeZone !== undefined) {
    url.searchParams.set('timeZone', timeZone);
  }

  return requestProfile({ fetch, timeoutMs }, url.href, { headers: { cookie } });
}

export async function saveUnits({ baseUrl, cookie, fetch, timeoutMs, units }: ProfileRequest & { units: Units }) {
  return requestProfile({ fetch, timeoutMs }, new URL('/me/profile', requireBaseUrl(baseUrl)).href, {
    method: 'PUT',
    headers: { cookie, 'content-type': 'application/json' },
    body: JSON.stringify({ units }),
  });
}
