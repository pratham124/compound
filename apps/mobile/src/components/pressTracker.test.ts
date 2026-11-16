import { createPressTracker } from './pressTracker.ts';

describe('createPressTracker', () => {
  it('lets the press that is still held confirm, once', () => {
    const tracker = createPressTracker();
    const id = tracker.start();

    expect(tracker.tryConfirm(id)).toBe(true);
    expect(tracker.tryConfirm(id)).toBe(false);
    expect(tracker.confirmed()).toBe(true);
  });

  it('does not confirm a press whose finger has already lifted', () => {
    const tracker = createPressTracker();
    const id = tracker.start();

    tracker.end();

    expect(tracker.tryConfirm(id)).toBe(false);
    expect(tracker.confirmed()).toBe(false);
  });

  it('does not let a late completion from an earlier press confirm the next one', () => {
    const tracker = createPressTracker();
    const first = tracker.start();

    tracker.end();
    tracker.start();

    expect(tracker.tryConfirm(first)).toBe(false);
  });

  it('starts each press unconfirmed', () => {
    const tracker = createPressTracker();

    tracker.tryConfirm(tracker.start());

    tracker.end();

    const second = tracker.start();

    expect(tracker.confirmed()).toBe(false);
    expect(tracker.tryConfirm(second)).toBe(true);
  });
});
