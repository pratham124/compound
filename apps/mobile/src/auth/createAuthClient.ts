import { expoClient } from '@better-auth/expo/client';
import { emailOTPClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';

export type SessionStorage = Parameters<typeof expoClient>[0]['storage'];

export type AppAuthClientOptions = {
  baseUrl: string | undefined;
  storage: SessionStorage;
};

export function createAppAuthClient({ baseUrl, storage }: AppAuthClientOptions) {
  return createAuthClient({
    baseURL: baseUrl,
    plugins: [expoClient({ scheme: 'compound', storagePrefix: 'compound', storage }), emailOTPClient()],
  });
}
