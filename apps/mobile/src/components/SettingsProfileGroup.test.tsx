import { render, screen } from '@testing-library/react-native';

import { colors } from '../theme/tokens.ts';
import { SettingsProfileGroup } from './SettingsProfileGroup.tsx';

function group(user: { name: string; email: string }) {
  return <SettingsProfileGroup palette={colors.light} user={user} />;
}

describe('SettingsProfileGroup', () => {
  it('shows the first and last initials, the name, and the email beneath it', async () => {
    await render(group({ name: 'Pratham Sitoula', email: 'pratham@example.com' }));

    // The initials are decoration for screen readers, which get the name instead.
    expect(screen.getByText('PS', { includeHiddenElements: true })).toBeOnTheScreen();
    expect(screen.getByText('Pratham Sitoula')).toBeOnTheScreen();
    expect(screen.getByText('pratham@example.com')).toBeOnTheScreen();
  });

  it('shows the email and no initials when there is no name', async () => {
    await render(group({ name: '', email: 'pratham@example.com' }));

    expect(screen.getByText('pratham@example.com')).toBeOnTheScreen();
    expect(screen.queryByText('P', { includeHiddenElements: true })).not.toBeOnTheScreen();
  });

  it('says Signed in with Apple instead of showing a Hide My Email address', async () => {
    await render(group({ name: '', email: 'x7k2m9q4r1@privaterelay.appleid.com' }));

    expect(screen.getByText('Signed in with Apple')).toBeOnTheScreen();
    expect(screen.queryByText('x7k2m9q4r1@privaterelay.appleid.com')).not.toBeOnTheScreen();
  });

  it('shows Signed in with Apple under the name instead of a Hide My Email address', async () => {
    await render(group({ name: 'Pratham Sitoula', email: 'x7k2m9q4r1@privaterelay.appleid.com' }));

    expect(screen.getByText('Pratham Sitoula')).toBeOnTheScreen();
    expect(screen.getByText('Signed in with Apple')).toBeOnTheScreen();
    expect(screen.queryByText('x7k2m9q4r1@privaterelay.appleid.com')).not.toBeOnTheScreen();
  });
});
