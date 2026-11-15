import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useReducedMotion } from 'react-native-reanimated';

import { useAuthClient } from '../src/auth/AuthClientContext.tsx';
import { sessionLoadedOnce } from '../src/auth/sessionLoadedOnce.ts';
import { ChatButtonOverlay } from '../src/chatButton/ChatButtonOverlay.tsx';
import { fonts, motion } from '../src/theme/tokens.ts';
import { useAppearance } from '../src/theme/useAppearance.ts';

SplashScreen.setOptions({ fade: true, duration: motion.splashFadeMs });

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    [fonts.display]: require('../assets/fonts/Fraunces-Variable.ttf'),
  });

  const authClient = useAuthClient();
  const { data: session, isPending } = authClient.useSession();
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
        <Stack screenOptions={{ headerShown: false, animation: reduceMotion ? 'fade' : 'default' }}>
          <Stack.Protected guard={session !== null}>
            <Stack.Screen name="(tabs)" options={{ animation: 'fade', animationDuration: motion.screenFadeMs }} />
            <Stack.Screen
              name="settings"
              options={{
                headerShown: true,
                title: 'Settings',
                headerBackTitle: 'Today',
                headerLargeTitleEnabled: true,
                headerTransparent: true,
                headerTintColor: palette.accent,
                headerLargeTitleStyle: { color: palette.label },
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
          </Stack.Protected>
        </Stack>
        <ChatButtonOverlay />
      </GestureHandlerRootView>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
