import { Profile } from '@compound/contracts';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useProfile } from './useProfile.ts';

const metric = Profile.parse({ timeZone: 'Europe/Paris', units: 'metric' });
const imperial = Profile.parse({ ...metric, units: 'imperial' });
const savedByServer = Profile.parse({ timeZone: 'Asia/Tokyo', units: 'imperial' });

describe('useProfile', () => {
  it('loads the profile and then shows it', async () => {
    const { result } = await renderHook(() => useProfile({ load: async () => metric, save: async () => imperial }));

    await waitFor(() => expect(result.current.state).toEqual({ kind: 'ready', profile: metric, save: { kind: 'idle' } }));
  });

  it('reports a failed load, and loads again on retry', async () => {
    let calls = 0;

    const { result } = await renderHook(() =>
      useProfile({
        load: async () => {
          calls += 1;

          if (calls === 1) {
            throw new Error('offline');
          }

          return metric;
        },
        save: async () => imperial,
      }),
    );

    await waitFor(() => expect(result.current.state.kind).toBe('failed'));

    await act(async () => result.current.retry());

    await waitFor(() => expect(result.current.state.kind).toBe('ready'));
  });

  it('shows the profile the server saved after a units change', async () => {
    const { result } = await renderHook(() => useProfile({ load: async () => metric, save: async () => savedByServer }));

    await waitFor(() => expect(result.current.state.kind).toBe('ready'));
    await act(() => result.current.chooseUnits('imperial'));

    expect(result.current.state).toEqual({ kind: 'ready', profile: savedByServer, save: { kind: 'idle' } });
  });

  it('keeps the old units and flags the failure when saving fails', async () => {
    const { result } = await renderHook(() =>
      useProfile({
        load: async () => metric,
        save: async () => {
          throw new Error('offline');
        },
      }),
    );

    await waitFor(() => expect(result.current.state.kind).toBe('ready'));
    await act(() => result.current.chooseUnits('imperial'));

    expect(result.current.state).toEqual({ kind: 'ready', profile: metric, save: { kind: 'failed' } });
  });

  it('marks the chosen units as saving until the server answers', async () => {
    const answer = Promise.withResolvers<Profile>();

    const { result } = await renderHook(() => useProfile({ load: async () => metric, save: () => answer.promise }));

    await waitFor(() => expect(result.current.state.kind).toBe('ready'));
    await act(async () => {
      void result.current.chooseUnits('imperial');
    });

    expect(result.current.state).toEqual({ kind: 'ready', profile: metric, save: { kind: 'saving', units: 'imperial' } });

    await act(async () => answer.resolve(imperial));
  });

  it('does not save when the chosen units are already the stored ones', async () => {
    const save = jest.fn(async () => imperial);

    const { result } = await renderHook(() => useProfile({ load: async () => metric, save }));

    await waitFor(() => expect(result.current.state.kind).toBe('ready'));
    await act(() => result.current.chooseUnits('metric'));

    expect(save).not.toHaveBeenCalled();
  });

  it('clears an earlier failure when the person goes back to the stored units', async () => {
    const save = jest.fn(async (): Promise<Profile> => {
      throw new Error('offline');
    });

    const { result } = await renderHook(() => useProfile({ load: async () => metric, save }));

    await waitFor(() => expect(result.current.state.kind).toBe('ready'));
    await act(() => result.current.chooseUnits('imperial'));
    await act(() => result.current.chooseUnits('metric'));

    expect(result.current.state).toEqual({ kind: 'ready', profile: metric, save: { kind: 'idle' } });
  });

  it('ignores a load answer that arrives after a retry has started', async () => {
    const first = Promise.withResolvers<Profile>();
    const loads = [first.promise, Promise.resolve(imperial)];

    const { result } = await renderHook(() =>
      useProfile({ load: () => loads.shift() ?? Promise.resolve(imperial), save: async () => imperial }),
    );

    await act(async () => result.current.retry());
    await waitFor(() => expect(result.current.state).toEqual({ kind: 'ready', profile: imperial, save: { kind: 'idle' } }));

    await act(async () => first.resolve(metric));

    expect(result.current.state).toEqual({ kind: 'ready', profile: imperial, save: { kind: 'idle' } });
  });
});
