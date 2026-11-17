import { closeQuickChat } from './closeQuickChat.ts';

function fakeRouter(canGoBack: boolean) {
  return { canGoBack: () => canGoBack, back: jest.fn(), replace: jest.fn() };
}

describe('closeQuickChat', () => {
  it('goes back to the screen the sheet was opened over', () => {
    const router = fakeRouter(true);

    closeQuickChat(router);

    expect(router.back).toHaveBeenCalledTimes(1);
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('goes to the home screen when the sheet was opened cold, with nothing to go back to', () => {
    const router = fakeRouter(false);

    closeQuickChat(router);

    expect(router.replace).toHaveBeenCalledWith('/');
    expect(router.back).not.toHaveBeenCalled();
  });
});
