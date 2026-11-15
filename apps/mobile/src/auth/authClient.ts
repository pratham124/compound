import * as SecureStore from 'expo-secure-store';

import { createAppAuthClient } from './createAuthClient.ts';

// The session cookie, whose value is the opaque session token, lives in the iOS Keychain through SecureStore.
export const authClient = createAppAuthClient({ baseUrl: process.env.EXPO_PUBLIC_API_URL, storage: SecureStore });
