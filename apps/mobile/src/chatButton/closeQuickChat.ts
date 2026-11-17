export type SheetRouter = {
  canGoBack: () => boolean;
  back: () => void;
  replace: (href: '/') => void;
};

/**
 * Closes the quick-chat sheet. Opened from the chat button it sits on top of a screen, so going back reveals it. Opened
 * cold from a `compound://quick-chat` link there is nothing under it, so it goes to the home screen instead of doing nothing.
 */
export function closeQuickChat(router: SheetRouter): void {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace('/');
  }
}
