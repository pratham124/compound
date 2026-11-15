import type { screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

type RenderedElement = ReturnType<typeof screen.getByRole>;

/** What a Reanimated view is drawn with right now: its animated style once one exists, else its static style. */
export function currentStyle(element: RenderedElement) {
  return element.props['jestAnimatedStyle']?.value ?? StyleSheet.flatten(element.props['style']);
}
