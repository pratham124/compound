import { sessionLoadedOnce } from './sessionLoadedOnce.ts';

describe('sessionLoadedOnce', () => {
  it('is not loaded until the first session answer arrives', () => {
    expect(sessionLoadedOnce({ loadedBefore: false, isPending: true })).toBe(false);
    expect(sessionLoadedOnce({ loadedBefore: false, isPending: false })).toBe(true);
  });

  it('stays loaded when the app regains focus and the session is fetched again', () => {
    expect(sessionLoadedOnce({ loadedBefore: true, isPending: true })).toBe(true);
  });
});
