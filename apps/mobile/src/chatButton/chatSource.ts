import { z } from 'zod';

import { TABS } from '../navigation/tabs.ts';
import type { Screen } from './visibility.ts';

const chatSourceSchema = z.enum(['today', 'train', 'money', 'trends', 'other']);

/** The screen the quick-chat sheet was opened from. The Chat tab is absent: the button is hidden there. */
export type ChatSource = z.infer<typeof chatSourceSchema>;

export function chatSourceFromScreen(screen: Screen): ChatSource {
  switch (screen.kind) {
    case 'tab':
      return screen.tab === 'chat' ? 'other' : screen.tab;
    case 'settings':
    case 'task':
    case 'sign-in':
    case 'quick-chat':
    case 'other':
      return 'other';
    default: {
      const _exhaustive: never = screen;

      return _exhaustive;
    }
  }
}

export function parseChatSource(param: string | string[] | undefined): ChatSource {
  const parsed = chatSourceSchema.safeParse(param);

  return parsed.success ? parsed.data : 'other';
}

export function describeChatSource(source: ChatSource): string {
  switch (source) {
    case 'other':
      return 'About: this screen';
    case 'today':
    case 'train':
    case 'money':
    case 'trends':
      return `About: ${TABS[source].label}`;
    default: {
      const _exhaustive: never = source;

      return _exhaustive;
    }
  }
}
