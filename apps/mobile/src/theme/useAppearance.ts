import { useColorScheme } from 'react-native';

import { colors, type Palette } from './tokens.ts';

export type Scheme = 'light' | 'dark';

export type Appearance = { scheme: Scheme; palette: Palette };

export function useAppearance(): Appearance {
  const scheme: Scheme = useColorScheme() === 'dark' ? 'dark' : 'light';

  return { scheme, palette: colors[scheme] };
}
