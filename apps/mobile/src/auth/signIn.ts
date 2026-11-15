export type AppleFullName = { givenName: string | null; familyName: string | null };

export type AppleCredentialResult =
  | { kind: 'token'; token: string; fullName: AppleFullName | null }
  | { kind: 'cancelled' }
  | { kind: 'missing' };

export type AppleSignInDeps = {
  requestAppleIdentityToken: () => Promise<AppleCredentialResult>;
  exchange: (credential: { token: string; fullName: AppleFullName | null }) => Promise<{ ok: boolean }>;
};

export type SignInOutcome = { kind: 'signed-in' } | { kind: 'cancelled' } | { kind: 'failed' };

export async function signInWithApple({ requestAppleIdentityToken, exchange }: AppleSignInDeps): Promise<SignInOutcome> {
  try {
    const credential = await requestAppleIdentityToken();

    switch (credential.kind) {
      case 'cancelled':
        return { kind: 'cancelled' };
      case 'missing':
        return { kind: 'failed' };
      case 'token':
        return (await exchange({ token: credential.token, fullName: credential.fullName })).ok
          ? { kind: 'signed-in' }
          : { kind: 'failed' };
      default: {
        const _exhaustive: never = credential;

        return _exhaustive;
      }
    }
  } catch {
    return { kind: 'failed' };
  }
}

export type AppleUser = { name: { firstName?: string; lastName?: string } };

// Apple sends the name only on the first sign-in, so the phone must pass it to the server then.
export function appleUser(fullName: AppleFullName | null): AppleUser | undefined {
  const name: AppleUser['name'] = {};

  if (fullName?.givenName) {
    name.firstName = fullName.givenName;
  }

  if (fullName?.familyName) {
    name.lastName = fullName.familyName;
  }

  return Object.keys(name).length === 0 ? undefined : { name };
}

export type SignedInLabel = { kind: 'name'; name: string } | { kind: 'email'; email: string } | { kind: 'apple' };

const APPLE_RELAY_DOMAIN = '@privaterelay.appleid.com';

// What the signed-in card shows: the name, else the email. An Apple relay address
// (someone who chose Hide My Email) is a random string, so it shows "Signed in with Apple" instead.
export function signedInLabel({ name, email }: { name: string; email: string }): SignedInLabel {
  if (name.trim() !== '') {
    return { kind: 'name', name };
  }

  return email.endsWith(APPLE_RELAY_DOMAIN) ? { kind: 'apple' } : { kind: 'email', email };
}
