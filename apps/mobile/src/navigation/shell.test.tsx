import { router } from 'expo-router';
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AccessibilityInfo, DeviceEventEmitter, StyleSheet } from 'react-native';
import { createGestureController } from 'react-native-gesture-handler/jest-utils';
import type { ReactNode } from 'react';

import RootLayout from '../../app/_layout.tsx';
import TabsLayout from '../../app/(tabs)/_layout.tsx';
import Chat from '../../app/(tabs)/chat.tsx';
import Today from '../../app/(tabs)/index.tsx';
import Money from '../../app/(tabs)/money.tsx';
import Trends from '../../app/(tabs)/trends.tsx';
import Train from '../../app/(tabs)/train.tsx';
import QuickChat from '../../app/quick-chat.tsx';
import Settings from '../../app/settings.tsx';
import { AuthClientContext, type ShellAuthClient } from '../auth/AuthClientContext.tsx';
import { PAN_TEST_ID, TAP_TEST_ID } from '../chatButton/ChatButton.tsx';
import { chatButton, press } from '../theme/tokens.ts';
import { currentStyle } from '../testing/animatedStyle.ts';

const routes = {
  _layout: RootLayout,
  '(tabs)/_layout': TabsLayout,
  '(tabs)/index': Today,
  '(tabs)/train': Train,
  '(tabs)/money': Money,
  '(tabs)/trends': Trends,
  '(tabs)/chat': Chat,
  settings: Settings,
  'quick-chat': QuickChat,
};

// The tabs sit behind the sign-in gate; these tests start signed in.
const signedIn: ShellAuthClient = {
  useSession: () => ({ data: { user: { name: 'Pratham', email: 'pratham@example.com' } }, isPending: false }),
  getCookie: async () => '',
  signOut: async () => undefined,
};

function SignedIn({ children }: { children: ReactNode }) {
  return <AuthClientContext value={signedIn}>{children}</AuthClientContext>;
}

async function renderApp(initialUrl: string) {
  return renderRouter(routes, { initialUrl, wrapper: SignedIn });
}

const BUTTON = { name: 'Ask Compound' };

beforeEach(async () => {
  await AsyncStorage.clear();
});

afterEach(() => {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
});

function buttonX() {
  return currentStyle(screen.getByRole('button', BUTTON)).transform[0].translateX;
}

function buttonOpacity() {
  return currentStyle(screen.getByRole('button', { ...BUTTON, hidden: true })).opacity;
}

function countBlinkingEyes() {
  return JSON.stringify(screen.toJSON()).match(/"animationName"/g)?.length ?? 0;
}

describe('chat button in the app shell', () => {
  it('shows on Money, and opens the quick chat sheet saying it came from Money', async () => {
    await renderApp('/money');
    await screen.findByRole('button', BUTTON);

    const tap = createGestureController(TAP_TEST_ID);

    await act(() => {
      tap.begin();
      tap.activate();
      tap.end();
    });

    await waitFor(() => expect(screen).toHavePathname('/quick-chat'));
    expect(await screen.findByRole('header', { name: 'Ask Compound' })).toBeTruthy();
    expect(await screen.findByText('About: Money')).toBeTruthy();

  });

  it('goes away when you switch to the Chat tab', async () => {
    await renderApp('/money');
    await screen.findByRole('button', BUTTON);

    await act(() => {
      router.navigate('/chat');
    });

    await waitFor(() => expect(screen).toHavePathname('/chat'));
    expect(screen.queryByRole('button', BUTTON)).toBeNull();
  });

  it('fades out while the keyboard is up, then fades back in', async () => {
    await renderApp('/train');
    await screen.findByRole('button', BUTTON);

    await act(() => {
      DeviceEventEmitter.emit('keyboardWillShow', {});
    });

    expect(screen.queryByRole('button', BUTTON)).toBeNull();
    await waitFor(() => expect(buttonOpacity()).toBe(0));

    await act(() => {
      DeviceEventEmitter.emit('keyboardWillHide', {});
    });

    expect(await screen.findByRole('button', BUTTON)).toBeTruthy();
    await waitFor(() => expect(buttonOpacity()).toBe(1));
  });

  it('plays its entrance only the first time it appears, not when you come back from another tab', async () => {
    await renderApp('/money');
    await screen.findByRole('button', BUTTON);
    await waitFor(() => expect(buttonOpacity()).toBe(1), { timeout: 8000 });

    await act(() => {
      router.navigate('/chat');
    });

    await waitFor(() => expect(screen.queryByRole('button', BUTTON)).toBeNull());

    await act(() => {
      router.navigate('/money');
    });

    await screen.findByRole('button', BUTTON);

    expect(buttonOpacity()).toBe(1);
  });

  it('fades out under the quick chat sheet instead of vanishing, then fades back when it closes', async () => {
    await renderApp('/money');
    await screen.findByRole('button', BUTTON);

    await act(() => {
      router.push('/quick-chat');
    });

    await waitFor(() => expect(screen.queryByRole('button', BUTTON)).toBeNull());
    await waitFor(() => expect(buttonOpacity()).toBe(0));

    await act(() => {
      router.back();
    });

    expect(await screen.findByRole('button', BUTTON)).toBeTruthy();
    await waitFor(() => expect(buttonOpacity()).toBe(1));
  });
});

describe('chat button position across restarts', () => {
  it('saves where the button was dropped, and the next launch puts it back on that edge', async () => {
    await renderApp('/money');
    await screen.findByRole('button', BUTTON);

    const pan = createGestureController(PAN_TEST_ID);

    pan.begin();
    pan.activate({ translationX: 0, translationY: 0 });
    pan.update({ translationX: -600, translationY: 0 });
    pan.end({ translationX: -600, translationY: 0, velocityX: 0, velocityY: 0 });

    let saved: string | null = null;

    await waitFor(async () => {
      saved = await AsyncStorage.getItem('chatButton.position');
      expect(saved).not.toBeNull();
    });

    expect(JSON.parse(saved ?? 'null')).toMatchObject({ edge: 'left' });

    await screen.unmount();
    await renderApp('/money');
    await screen.findByRole('button', BUTTON);

    await waitFor(() => expect(buttonX()).toBe(chatButton.edgeGap));
  });
});

describe('chat button and Reduce Motion', () => {
  it('blinks by default', async () => {
    await renderApp('/money');
    await screen.findByRole('button', BUTTON);

    expect(countBlinkingEyes()).toBe(2);
  });

  it('does not blink when iOS Reduce Motion is already on at launch', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    await renderApp('/money');
    await screen.findByRole('button', BUTTON);

    await waitFor(() => expect(countBlinkingEyes()).toBe(0));
  });

  it('stops blinking when Reduce Motion is switched on while the app is open', async () => {
    let switchReduceMotion: ((enabled: boolean) => void) | undefined;

    // The React Native Jest setup replaces AccessibilityInfo, so its events never fire on their own.
    jest.spyOn(AccessibilityInfo, 'addEventListener').mockImplementationOnce((eventName, handler) => {
      if (eventName === 'reduceMotionChanged') {
        switchReduceMotion = handler;
      }

      return { remove: jest.fn() };
    });

    await renderApp('/money');
    await screen.findByRole('button', BUTTON);

    await act(() => {
      switchReduceMotion?.(true);
    });

    expect(countBlinkingEyes()).toBe(0);
  });
});

describe('chat button and scrolling', () => {
  it('lives outside every scroll view, so a drag on it cannot scroll a screen and a scroll cannot move it', async () => {
    await renderApp('/money');
    await screen.findByRole('button', BUTTON);

    const scrollViews = screen.container.queryAll((node) => node.type === 'RCTScrollView');

    const buttonsInsideScrollViews = scrollViews.flatMap((scrollView) =>
      scrollView.queryAll((node) => node.props['accessibilityLabel'] === 'Ask Compound'),
    );

    expect(scrollViews.length).toBeGreaterThan(0);
    expect(buttonsInsideScrollViews).toHaveLength(0);
  });
});

describe('profile button press feedback', () => {
  function feedbackStyle() {
    const [feedback] = screen
      .getByRole('button', { name: 'Settings' })
      .queryAll((node) => 'transitionProperty' in (StyleSheet.flatten(node.props['style']) ?? {}));

    return StyleSheet.flatten(feedback?.props['style']);
  }

  it('shrinks to 95% while pressed, the stronger scale for small icon buttons', async () => {
    await renderApp('/');
    await fireEvent(await screen.findByRole('button', { name: 'Settings' }), 'pressIn');

    expect(feedbackStyle().transform[0].scale).toBe(0.95);
  });

  it('dims instead of shrinking when Reduce Motion is on', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    await renderApp('/');
    await screen.findByRole('button', BUTTON);
    await waitFor(() => expect(countBlinkingEyes()).toBe(0));
    await fireEvent(screen.getByRole('button', { name: 'Settings' }), 'pressIn');

    expect(feedbackStyle().opacity).toBe(press.reducedMotionOpacity);
    expect(feedbackStyle().transform).toBeUndefined();
  });
});

describe('profile button on Today', () => {
  it('opens Settings', async () => {
    await renderApp('/');

    await fireEvent.press(await screen.findByRole('button', { name: 'Settings' }));

    await waitFor(() => expect(screen).toHavePathname('/settings'));
  });
});
