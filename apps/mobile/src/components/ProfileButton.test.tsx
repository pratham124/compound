import { renderRouter, screen } from 'expo-router/testing-library';
import type { ReactNode } from 'react';

import { AuthClientContext, type ShellAuthClient } from '../auth/AuthClientContext.tsx';
import { ProfileButton } from './ProfileButton.tsx';

function signedInAs(name: string): ShellAuthClient {
  return {
    useSession: () => ({ data: { user: { name, email: 'someone@example.com' } }, isPending: false }),
    getCookie: async () => '',
    signOut: async () => undefined,
  };
}

async function renderButton(name: string) {
  function Wrapper({ children }: { children: ReactNode }) {
    return <AuthClientContext value={signedInAs(name)}>{children}</AuthClientContext>;
  }

  await renderRouter({ index: ProfileButton }, { wrapper: Wrapper });
}

describe('ProfileButton', () => {
  it('shows the first and last initials of the signed-in name, still labelled Settings', async () => {
    await renderButton('Pratham Sitoula');

    expect(screen.getByRole('button', { name: 'Settings' })).toBeOnTheScreen();
    expect(screen.getByText('PS')).toBeOnTheScreen();
  });

  it('shows no letters when there is no name to take them from', async () => {
    await renderButton('');

    expect(screen.getByRole('button', { name: 'Settings' })).toBeOnTheScreen();
    expect(screen.queryByText(/\S/u)).not.toBeOnTheScreen();
  });
});
