import * as AppleAuthentication from 'expo-apple-authentication';

import type { AppleCredentialResult } from './signIn.ts';

const CANCELLED_CODE = 'ERR_REQUEST_CANCELED';

export async function requestAppleIdentityToken(): Promise<AppleCredentialResult> {
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
    });

    return credential.identityToken === null
      ? { kind: 'missing' }
      : {
          kind: 'token',
          token: credential.identityToken,
          fullName: credential.fullName && {
            givenName: credential.fullName.givenName,
            familyName: credential.fullName.familyName,
          },
        };
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === CANCELLED_CODE) {
      return { kind: 'cancelled' };
    }

    throw error;
  }
}
