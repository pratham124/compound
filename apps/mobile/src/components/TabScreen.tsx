import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { chatButton, layout, space, titleFit, type } from '../theme/tokens.ts';
import { useAppearance } from '../theme/useAppearance.ts';

export type TabScreenProps = {
  title: string;
  /** Sits level with the title, at the trailing edge. */
  trailing?: ReactNode;
  children?: ReactNode;
};

export function TabScreen({ title, trailing, children }: TabScreenProps) {
  const { palette } = useAppearance();

  return (
    <ScrollView
      style={{ backgroundColor: palette.bg }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <Text
          accessibilityRole="header"
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={titleFit.minimumFontScale}
          style={[type.largeTitle, styles.title, { color: palette.label }]}
        >
          {title}
        </Text>
        {trailing === undefined ? null : <View style={styles.trailing}>{trailing}</View>}
      </View>
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    gap: space.xxl,
    paddingHorizontal: layout.screenMargin,
    paddingTop: space.xxl,
    // Keeps the last row clear of the chat button's resting place above the tab bar.
    paddingBottom: chatButton.touch + layout.tabBarHeight + layout.tabBarBottom,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
  },
  title: { flexShrink: 1 },
  trailing: { flexShrink: 0 },
});
