import { chatSourceFromScreen, describeChatSource, parseChatSource } from './chatSource.ts';

describe('chatSourceFromScreen', () => {
  it('names the tab the button was tapped on', () => {
    expect(chatSourceFromScreen({ kind: 'tab', tab: 'money' })).toBe('money');
  });

  it('falls back to "other" on a screen with no name of its own', () => {
    expect(chatSourceFromScreen({ kind: 'other' })).toBe('other');
  });
});

describe('parseChatSource', () => {
  it('reads a known source from the route parameter', () => {
    expect(parseChatSource('trends')).toBe('trends');
  });

  it.each([undefined, 'nonsense', ['today', 'train']])('falls back to "other" for %p', (value) => {
    expect(parseChatSource(value)).toBe('other');
  });
});

describe('describeChatSource', () => {
  it('names the screen the chat is about, in the "About:" form from the mockup', () => {
    expect(describeChatSource('money')).toBe('About: Money');
  });

  it('says "this screen" when the source has no name', () => {
    expect(describeChatSource('other')).toBe('About: this screen');
  });
});
