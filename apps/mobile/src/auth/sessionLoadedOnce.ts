/**
 * The session client reports `isPending` again on every refetch while signed out, and the app refetches each time
 * it regains focus. Holding the splash on that would unmount the sign-in screens and lose the email step.
 */
export function sessionLoadedOnce({ loadedBefore, isPending }: { loadedBefore: boolean; isPending: boolean }): boolean {
  return loadedBefore || !isPending;
}
