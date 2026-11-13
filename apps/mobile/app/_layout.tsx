import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { fonts } from '../src/theme/tokens.ts';

SplashScreen.setOptions({ fade: true, duration: 200 });

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    [fonts.display]: require('../assets/fonts/Fraunces[SOFT,WONK,opsz,wght].ttf'),
  });

  const fontsSettled = fontsLoaded || fontError !== null;

  useEffect(() => {
    if (fontsSettled) {
      void SplashScreen.hideAsync();
    }
  }, [fontsSettled]);

  if (!fontsSettled) {
    return null;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
