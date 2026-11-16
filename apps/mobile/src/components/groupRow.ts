import { StyleSheet } from 'react-native';

import { layout, radius, space } from '../theme/tokens.ts';

/** The metrics of one button row in a list group (`.lrow` in the mockup). */
export const groupRow = StyleSheet.create({
  row: {
    minHeight: layout.minTouch,
    justifyContent: 'center',
    paddingVertical: space.sm,
    paddingHorizontal: 10,
    borderRadius: radius.row,
  },
}).row;
