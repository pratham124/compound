import { usePathname, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useReduceMotion } from '../accessibility/useReduceMotion.ts';
import { useWorkoutStatus } from '../workout/workoutStatus.ts';
import { ChatButton } from './ChatButton.tsx';
import { chatSourceFromScreen } from './chatSource.ts';
import { devicePositionStore } from './devicePositionStore.ts';
import type { ButtonPosition } from './position.ts';
import { useKeyboardVisible } from './useKeyboardVisible.ts';
import { chatButtonPresence, screenFromPathname } from './visibility.ts';

/** Sits above the navigator, so a drag that starts on the button never reaches a screen's scroll view. */
export function ChatButtonOverlay() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const keyboardVisible = useKeyboardVisible();
  const workout = useWorkoutStatus();
  const reduceMotion = useReduceMotion();
  const [position, setPosition] = useState<ButtonPosition | null>(null);
  const [entranceSpent, setEntranceSpent] = useState(false);
  const spendEntrance = useCallback(() => setEntranceSpent(true), []);

  useEffect(() => {
    let current = true;

    void devicePositionStore.load().then((loaded) => {
      if (current) {
        setPosition(loaded);
      }
    });

    return () => {
      current = false;
    };
  }, []);

  const screenBox = useMemo(
    () => ({ width, height, insetTop: insets.top, insetBottom: insets.bottom }),
    [width, height, insets.top, insets.bottom],
  );

  const screen = screenFromPathname(pathname);

  const presence = chatButtonPresence({ screen, keyboardVisible, workout });

  if (position === null || presence === 'removed') {
    return null;
  }

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <ChatButton
        initialPosition={position}
        screen={screenBox}
        reduceMotion={reduceMotion}
        visibility={presence}
        appear={entranceSpent ? 'instant' : 'entrance'}
        onShown={spendEntrance}
        onPress={() => router.push({ pathname: '/quick-chat', params: { from: chatSourceFromScreen(screen) } })}
        onMoved={(moved) => {
          setPosition(moved);
          void devicePositionStore.save(moved);
        }}
      />
    </View>
  );
}

