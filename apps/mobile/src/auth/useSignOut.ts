import { useRef, useState } from "react";

import type { ShellAuthClient } from "./AuthClientContext.tsx";
import { endSessionOnServer } from "./serverSignOut.ts";
import { signOut } from "./signOut.ts";

export type SignOutAuthClient = Pick<ShellAuthClient, "getCookie" | "signOut">;

/**
 * Signs out through the server first and clears the phone's session only if that worked (see `signOut`), tracking
 * whether it is running and whether the last try failed.
 */
export function useSignOut({
  baseUrl,
  authClient,
}: {
  baseUrl: string | undefined;
  authClient: SignOutAuthClient;
}) {
  const [signingOut, setSigningOut] = useState(false);
  const [failed, setFailed] = useState(false);
  // Two taps in one frame both land before `disabled` re-renders, so the guard can't rely on state.
  const running = useRef(false);

  async function run() {
    if (running.current) {
      return;
    }

    running.current = true;
    setSigningOut(true);
    setFailed(false);

    const outcome = await signOut({
      endSessionOnServer: async () =>
        endSessionOnServer({ baseUrl, cookie: await authClient.getCookie() }),
      clearLocalSession: async () => {
        await authClient.signOut();
      },
    });

    running.current = false;
    setSigningOut(false);
    setFailed(outcome.kind === "failed");
  }

  return { signingOut, failed, run };
}
