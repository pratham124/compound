import { StyleSheet } from 'react-native';

import { layout, radius, space } from '../../theme/tokens.ts';

/** Card and grouped-row metrics shared by the Train sections (`.card`, `.gh` and `.grp` in the mockup). */
export const sectionStyles = StyleSheet.create({
  card: { borderRadius: radius.card, padding: layout.cardPadding, gap: space.xs },
  section: { gap: space.sm, paddingTop: space.sm },
  groupHeading: { paddingHorizontal: space.xs, fontWeight: '600' },
  group: { borderRadius: radius.card, padding: space.sm, gap: layout.groupGap },
  row: { minHeight: layout.minTouch, paddingHorizontal: 10, paddingVertical: space.sm, borderRadius: radius.row, flexDirection: 'row', alignItems: 'center', gap: space.md },
  rowLabel: { flex: 1, fontWeight: '600' },
  empty: { padding: space.sm },
});
