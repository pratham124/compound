import { Profile } from '@compound/contracts';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Dimensions, StyleSheet } from 'react-native';

import { blob, colors, space } from '../theme/tokens.ts';
import { ProfileCard } from './ProfileCard.tsx';

const profile = Profile.parse({ timeZone: 'America/Los_Angeles', units: 'metric' });

function setFontScale(fontScale: number) {
  Dimensions.set({ window: { width: 390, height: 844, scale: 3, fontScale } });
}

beforeEach(() => setFontScale(1));

function card(state: Parameters<typeof ProfileCard>[0]['state'], handlers: { onChooseUnits?: jest.Mock; onRetry?: jest.Mock } = {}) {
  return (
    <ProfileCard
      palette={colors.light}
      state={state}
      onChooseUnits={handlers.onChooseUnits ?? jest.fn()}
      onRetry={handlers.onRetry ?? jest.fn()}
    />
  );
}

describe('ProfileCard', () => {
  it('shows the weight units choice as kg and lb, with the stored one chosen', async () => {
    await render(card({ kind: 'ready', profile, save: { kind: 'idle' } }));

    expect(screen.getByText('Units')).toBeOnTheScreen();
    expect(screen.getByLabelText('Units')).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'kg' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'lb' })).not.toBeChecked();
  });

  it('shows the time zone as plain text beside its label', async () => {
    await render(card({ kind: 'ready', profile, save: { kind: 'idle' } }));

    expect(screen.getByText('Time Zone')).toBeOnTheScreen();
    expect(screen.getByText('America/Los Angeles')).toBeOnTheScreen();
  });

  it('keeps a long time zone on one line, cut off at the end', async () => {
    await render(
      card({ kind: 'ready', profile: Profile.parse({ timeZone: 'America/Argentina/Rio_Gallegos', units: 'metric' }), save: { kind: 'idle' } }),
    );

    const zone = screen.getByText('America/Argentina/Rio Gallegos');

    expect(zone.props.numberOfLines).toBe(1);
    expect(zone.props.ellipsizeMode).toBe('tail');
  });

  it('keeps each row on one line at normal text sizes and stacks the value under its label at larger ones', async () => {
    const ready = card({ kind: 'ready', profile, save: { kind: 'idle' } });
    const { rerender } = await render(ready);

    expect(StyleSheet.flatten(screen.getByTestId('row-Units').props.style).flexDirection).toBe('row');
    expect(StyleSheet.flatten(screen.getByTestId('row-Time Zone').props.style).flexDirection).toBe('row');
    expect(StyleSheet.flatten(screen.getByText('America/Los Angeles').props.style).textAlign).toBe('right');

    setFontScale(1.4);
    await rerender(ready);

    expect(StyleSheet.flatten(screen.getByTestId('row-Units').props.style).flexDirection).toBe('column');
    expect(StyleSheet.flatten(screen.getByTestId('row-Time Zone').props.style).flexDirection).toBe('column');
    expect(StyleSheet.flatten(screen.getByText('America/Los Angeles').props.style).textAlign).toBe('left');
  });

  it('indents the stacked time zone under its label by the width of its blob, like the units row', async () => {
    setFontScale(1.4);
    await render(card({ kind: 'ready', profile, save: { kind: 'idle' } }));

    const indent = blob.width + space.md;

    expect(StyleSheet.flatten(screen.getByTestId('trail-Units').props.style).paddingLeft).toBe(indent);
    expect(StyleSheet.flatten(screen.getByTestId('trail-Time Zone').props.style).paddingLeft).toBe(indent);
  });

  it('reports metric for kg and imperial for lb', async () => {
    const onChooseUnits = jest.fn();

    await render(card({ kind: 'ready', profile, save: { kind: 'idle' } }, { onChooseUnits }));
    await fireEvent.press(screen.getByRole('radio', { name: 'lb' }));

    expect(onChooseUnits).toHaveBeenCalledWith('imperial');
  });

  it('ignores taps while a change is saving', async () => {
    const onChooseUnits = jest.fn();

    await render(card({ kind: 'ready', profile, save: { kind: 'saving', units: 'imperial' } }, { onChooseUnits }));
    await fireEvent.press(screen.getByRole('radio', { name: 'kg' }));

    expect(onChooseUnits).not.toHaveBeenCalled();
  });

  it('shows the units being saved as chosen before the server answers', async () => {
    await render(card({ kind: 'ready', profile, save: { kind: 'saving', units: 'imperial' } }));

    expect(screen.getByRole('radio', { name: 'lb' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'kg' })).not.toBeChecked();
  });

  it('says so when a change could not be saved', async () => {
    await render(card({ kind: 'ready', profile, save: { kind: 'failed' } }));

    expect(screen.getByRole('alert')).toHaveTextContent(/Couldn't save that/);
  });

  it('offers a retry when the profile could not be loaded', async () => {
    const onRetry = jest.fn();

    await render(card({ kind: 'failed' }, { onRetry }));
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
