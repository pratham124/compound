import { TAB_NAMES, TABS, type TabName } from '../navigation/tabs.ts';
import type { WorkoutStatus } from '../workout/workoutStatus.ts';

export const TASK_SCREENS = ['set-up-budgets', 'new-routine', 'workout-finished'] as const;

export type TaskScreen = (typeof TASK_SCREENS)[number];

export type Screen =
  | { kind: 'tab'; tab: TabName }
  | { kind: 'settings' }
  | { kind: 'task'; task: TaskScreen }
  | { kind: 'sign-in' }
  | { kind: 'quick-chat' }
  | { kind: 'other' };

const TASK_PATHS: Record<TaskScreen, string> = {
  'set-up-budgets': '/money/set-up-budgets',
  'new-routine': '/train/new-routine',
  'workout-finished': '/train/workout-finished',
};

export function screenFromPathname(pathname: string): Screen {
  for (const tab of TAB_NAMES) {
    if (TABS[tab].path === pathname) {
      return { kind: 'tab', tab };
    }
  }

  for (const task of TASK_SCREENS) {
    if (TASK_PATHS[task] === pathname) {
      return { kind: 'task', task };
    }
  }

  switch (pathname) {
    case '/settings':
      return { kind: 'settings' };
    case '/quick-chat':
      return { kind: 'quick-chat' };
    case '/sign-in':
    case '/email-code':
      return { kind: 'sign-in' };
    default:
      return { kind: 'other' };
  }
}

/**
 * `removed` takes the button off the screen at once. `faded-out` (the keyboard) and `under-sheet` (the quick
 * chat sheet) keep it mounted and fade it, so it leaves and comes back smoothly.
 */
export type ChatButtonPresence = 'shown' | 'faded-out' | 'under-sheet' | 'removed';

function presenceOnScreen(screen: Screen): ChatButtonPresence {
  switch (screen.kind) {
    case 'tab':
      return screen.tab === 'chat' ? 'removed' : 'shown';
    case 'task':
    case 'sign-in':
    case 'settings':
      return 'removed';
    case 'quick-chat':
      return 'under-sheet';
    case 'other':
      return 'shown';
    default: {
      const _exhaustive: never = screen;

      return _exhaustive;
    }
  }
}

export function chatButtonPresence(state: {
  screen: Screen;
  keyboardVisible: boolean;
  workout: WorkoutStatus;
}): ChatButtonPresence {
  if (state.workout.kind === 'in-progress') {
    return 'removed';
  }

  const onScreen = presenceOnScreen(state.screen);

  return onScreen === 'shown' && state.keyboardVisible ? 'faded-out' : onScreen;
}
