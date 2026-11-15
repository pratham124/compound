import { renderRouter, screen } from 'expo-router/testing-library';

import TabsLayout from '../../app/(tabs)/_layout.tsx';
import Chat from '../../app/(tabs)/chat.tsx';
import Today from '../../app/(tabs)/index.tsx';
import Money from '../../app/(tabs)/money.tsx';
import Trends from '../../app/(tabs)/trends.tsx';
import Train from '../../app/(tabs)/train.tsx';

describe('tab shell', () => {
  it('uses the native iOS tab bar with Today, Train, Money, Trends, Chat in that order', async () => {
    await renderRouter({
      '(tabs)/_layout': TabsLayout,
      '(tabs)/index': Today,
      '(tabs)/train': Train,
      '(tabs)/money': Money,
      '(tabs)/trends': Trends,
      '(tabs)/chat': Chat,
    });

    const hosts = screen.container.queryAll((node) => node.type === 'RNSTabsHostIOS');

    const titles = screen.container
      .queryAll((node) => node.type === 'RNSTabsScreenIOS')
      .map((tab) => tab.props['title']);

    expect(hosts).toHaveLength(1);
    expect(titles).toEqual(['Today', 'Train', 'Money', 'Trends', 'Chat']);
  });
});
