import { fireEvent, render, screen } from '@testing-library/react-native';

import { QuickChatHeader } from './QuickChatHeader.tsx';

describe('QuickChatHeader', () => {
  it('closes the sheet when Close is pressed', async () => {
    const onClose = jest.fn();

    await render(<QuickChatHeader onClose={onClose} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Close' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows the title as a heading', async () => {
    await render(<QuickChatHeader onClose={jest.fn()} />);

    expect(screen.getByRole('header', { name: 'Ask Compound' })).toBeOnTheScreen();
  });
});
