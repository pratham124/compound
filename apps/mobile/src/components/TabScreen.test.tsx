import { render, screen } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';

import { TabScreen } from './TabScreen.tsx';

function headerStyle() {
  return StyleSheet.flatten(screen.getByTestId('tab-header').props.style);
}

describe('TabScreen header', () => {
  it('centres the trailing button against the title when there is no subtitle', async () => {
    await render(<TabScreen title="Train" trailing={<Text>button</Text>} />);

    expect(headerStyle().alignItems).toBe('center');
  });

  it('lines the trailing button up with the top of the title block when there is a subtitle', async () => {
    await render(<TabScreen title="Today" subtitle={<Text>Morning.</Text>} trailing={<Text>button</Text>} />);

    expect(headerStyle().alignItems).toBe('flex-start');
    expect(screen.getByText('Morning.')).toBeOnTheScreen();
  });
});
