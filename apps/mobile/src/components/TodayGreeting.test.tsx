import { render, screen } from '@testing-library/react-native';

import { TodayGreeting } from './TodayGreeting.tsx';

describe('TodayGreeting', () => {
  it('shows the greeting with the first name, and the date beneath it', async () => {
    await render(<TodayGreeting now={new Date(2026, 10, 7, 9, 30)} name="Pratham Sitoula" />);

    expect(screen.getByText('Good morning, Pratham.')).toBeOnTheScreen();
    expect(screen.getByText('Saturday, 7 November')).toBeOnTheScreen();
  });
});
