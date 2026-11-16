import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { chatButton, layout, space, titleFit, type } from '../theme/tokens.ts';
import { useAppearance } from '../theme/useAppearance.ts';

export type TabScreenProps = {
  title: string;
  /** Lines under the title (Today's greeting and date). */
  subtitle?: ReactNode;
  /** Sits level with the title, at the trailing edge. With a subtitle it lines up with the top of the title block. */
  trailing?: ReactNode;
  children?: ReactNode;
};

export function TabScreen({ title, subtitle, trailing, children }: TabScreenProps) {
  const { palette } = useAppearance();

  return (
    <ScrollView
      style={{ backgroundColor: palette.bg }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
    >
      <View testID="tab-header" style={[styles.header, subtitle === undefined ? null : styles.headerTop]}>
        <View style={styles.titleBlock}>
          <Text
            accessibilityRole="header"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={titleFit.minimumFontScale}
            style={[type.largeTitle, { color: palette.label }]}
          >
            {title}
          </Text>
          {subtitle}
        </View>
        {trailing === undefined ? null : (
          <View style={[styles.trailing, subtitle === undefined ? null : styles.trailingTop]}>{trailing}</View>
        )}
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
  headerTop: { alignItems: 'flex-start' },
  titleBlock: { flexShrink: 1 },
  trailing: { flexShrink: 0 },
  trailingTop: { marginTop: space.xxs },
});
