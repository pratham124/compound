import { useMemo } from 'react';

import { useAuthClient } from './AuthClientContext.tsx';
import { parseSignedInSession, type SignedInSession } from './signedInSession.ts';

export function useSignedInSession(): { session: SignedInSession | null; isPending: boolean } {
  const { data, isPending } = useAuthClient().useSession();

  return useMemo(() => ({ session: parseSignedInSession(data), isPending }), [data, isPending]);
}
