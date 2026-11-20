import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useReducedMotion } from 'react-native-reanimated';

import { sessionLoadedOnce } from '../src/auth/sessionLoadedOnce.ts';
import { useSignedInSession } from '../src/auth/useSignedInSession.ts';
import { ChatButtonOverlay } from '../src/chatButton/ChatButtonOverlay.tsx';
import { fonts, motion } from '../src/theme/tokens.ts';
import { useAppearance } from '../src/theme/useAppearance.ts';
import { WorkoutProvider } from '../src/workout/WorkoutProvider.tsx';

SplashScreen.setOptions({ fade: true, duration: motion.splashFadeMs });

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    [fonts.display]: require('../assets/fonts/Fraunces-Variable.ttf'),
  });

  const { session, isPending } = useSignedInSession();
  const reduceMotion = useReducedMotion();
  const { scheme, palette } = useAppearance();
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;

  // The fade between sign-in and home shows the navigator's background mid-way; React Navigation's default is white.
  const theme = { ...base, colors: { ...base.colors, background: palette.bg } };

  const [sessionLoaded, setSessionLoaded] = useState(false);

  if (sessionLoadedOnce({ loadedBefore: sessionLoaded, isPending }) !== sessionLoaded) {
    setSessionLoaded(true);
  }

  const ready = (fontsLoaded || fontError !== null) && sessionLoaded;

  useEffect(() => {
    if (ready) {
      void SplashScreen.hideAsync();
    }
  }, [ready]);

  if (!ready) {
    return null;
  }

  return (
    <ThemeProvider value={theme}>
      <GestureHandlerRootView style={styles.root}>
        <WorkoutProvider>
        <Stack screenOptions={{ headerShown: false, animation: reduceMotion ? 'fade' : 'default' }}>
          <Stack.Protected guard={session !== null}>
            <Stack.Screen name="(tabs)" options={{ animation: 'fade', animationDuration: motion.screenFadeMs }} />
            <Stack.Screen name="train/add-exercise" options={{ presentation: 'modal' }} />
            <Stack.Screen name="train/workout-finished" options={{ gestureEnabled: false }} />
            <Stack.Screen
              name="exercises/index"
              options={{ headerShown: true, headerTitle: '', headerBackTitle: 'Train', headerTransparent: Platform.OS === 'ios', headerStyle: { backgroundColor: Platform.OS === 'ios' ? 'transparent' : palette.bg }, headerTintColor: palette.accent }}
            />
            <Stack.Screen
              name="exercises/[id]"
              options={{ headerShown: true, headerTitle: '', headerBackTitle: 'Exercises', headerTransparent: Platform.OS === 'ios', headerStyle: { backgroundColor: Platform.OS === 'ios' ? 'transparent' : palette.bg }, headerTintColor: palette.accent }}
            />
            <Stack.Screen
              name="settings"
              options={{
                headerShown: true,
                title: 'Settings',
                // The screen draws its own display-font title, so the header keeps only the back control.
                headerTitle: '',
                headerBackTitle: 'Today',
                headerTransparent: true,
                headerTintColor: palette.accent,
              }}
            />
            <Stack.Screen
              name="quick-chat"
              options={{ presentation: 'formSheet', sheetAllowedDetents: [0.5, 1], sheetGrabberVisible: true }}
            />
          </Stack.Protected>
          <Stack.Protected guard={session === null}>
            <Stack.Screen name="sign-in" options={{ animation: 'fade', animationDuration: motion.screenFadeMs }} />
            <Stack.Screen
              name="email-code"
              options={{ headerShown: true, headerTransparent: true, headerTitle: '', headerBackButtonDisplayMode: 'minimal' }}
            />
          </Stack.Protected>
          <Stack.Protected guard={__DEV__}>
            <Stack.Screen name="dev-fixtures" />
            <Stack.Screen name="dev-device-checks" />
          </Stack.Protected>
        </Stack>
        <ChatButtonOverlay />
        </WorkoutProvider>
      </GestureHandlerRootView>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
