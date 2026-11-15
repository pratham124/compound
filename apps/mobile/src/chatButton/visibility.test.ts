import type { WorkoutStatus } from '../workout/workoutStatus.ts';
import { chatButtonPresence, screenFromPathname, type Screen } from './visibility.ts';

const idle: WorkoutStatus = { kind: 'idle' };
const lifting: WorkoutStatus = { kind: 'in-progress' };

function presence(screen: Screen, overrides: { keyboardVisible?: boolean; workout?: WorkoutStatus } = {}) {
  return chatButtonPresence({ screen, keyboardVisible: overrides.keyboardVisible ?? false, workout: overrides.workout ?? idle });
}

describe('screenFromPathname', () => {
  it.each([
    ['/', 'today'],
    ['/train', 'train'],
    ['/money', 'money'],
    ['/trends', 'trends'],
    ['/chat', 'chat'],
  ] as const)('reads %s as the %s tab', (pathname, tab) => {
    expect(screenFromPathname(pathname)).toEqual({ kind: 'tab', tab });
  });

  it('reads the pushed screens by name', () => {
    expect(screenFromPathname('/settings')).toEqual({ kind: 'settings' });
    expect(screenFromPathname('/quick-chat')).toEqual({ kind: 'quick-chat' });
    expect(screenFromPathname('/sign-in')).toEqual({ kind: 'sign-in' });
    expect(screenFromPathname('/email-code')).toEqual({ kind: 'sign-in' });
  });

  it('reads the task screens that have a confirm button at the bottom', () => {
    expect(screenFromPathname('/money/set-up-budgets')).toEqual({ kind: 'task', task: 'set-up-budgets' });
    expect(screenFromPathname('/train/new-routine')).toEqual({ kind: 'task', task: 'new-routine' });
    expect(screenFromPathname('/train/workout-finished')).toEqual({ kind: 'task', task: 'workout-finished' });
  });

  it('treats any other route as a plain screen', () => {
    expect(screenFromPathname('/money/transactions/42')).toEqual({ kind: 'other' });
  });
});

describe('chatButtonPresence', () => {
  it.each(['today', 'train', 'money', 'trends'] as const)('shows on the %s tab', (tab) => {
    expect(presence({ kind: 'tab', tab })).toBe('shown');
  });

  it('removes it on the Chat tab', () => {
    expect(presence({ kind: 'tab', tab: 'chat' })).toBe('removed');
  });

  it('fades it out, rather than removing it, while the keyboard is up', () => {
    expect(presence({ kind: 'tab', tab: 'money' }, { keyboardVisible: true })).toBe('faded-out');
  });

  it('removes it during a workout, on any screen, even with the keyboard up', () => {
    expect(presence({ kind: 'tab', tab: 'train' }, { workout: lifting })).toBe('removed');
    expect(presence({ kind: 'other' }, { workout: lifting, keyboardVisible: true })).toBe('removed');
  });

  it.each(['set-up-budgets', 'new-routine', 'workout-finished'] as const)('removes it on the %s task screen', (task) => {
    expect(presence({ kind: 'task', task })).toBe('removed');
  });

  it('removes it on sign-in', () => {
    expect(presence({ kind: 'sign-in' })).toBe('removed');
  });

  it('fades it out, rather than removing it, under the quick chat sheet', () => {
    expect(presence({ kind: 'quick-chat' })).toBe('under-sheet');
  });

  it('removes it on Settings, which is not one of the four tabs', () => {
    expect(presence({ kind: 'settings' })).toBe('removed');
  });

  it('shows on other pushed screens, which sit inside a tab', () => {
    expect(presence({ kind: 'other' })).toBe('shown');
  });
});
