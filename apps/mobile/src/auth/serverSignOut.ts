import { answerFrom, type ServerAnswer } from './serverAnswer.ts';

export type EndSessionOptions = {
  baseUrl: string | undefined;
  cookie: string;
};

export async function endSessionOnServer({ baseUrl, cookie }: EndSessionOptions): Promise<ServerAnswer> {
  if (baseUrl === undefined || baseUrl === '') {
    throw new Error('EXPO_PUBLIC_API_URL is not set');
  }

  const response = await fetch(new URL('/api/auth/sign-out', baseUrl).href, {
    method: 'POST',
    headers: { cookie, 'content-type': 'application/json', 'expo-origin': 'compound://' },
    body: '{}',
  });

  return answerFrom({ error: response.ok ? null : { status: response.status } });
}
