import { defaultPosition } from './position.ts';
import { createPositionStore, type KeyValueStorage } from './positionStore.ts';

function memoryStorage(initial: Record<string, string> = {}): KeyValueStorage {
  const items = new Map(Object.entries(initial));

  return {
    getItem: (key) => Promise.resolve(items.get(key) ?? null),
    setItem: (key, value) => {
      items.set(key, value);

      return Promise.resolve();
    },
  };
}

describe('chat button position store', () => {
  it('gives the default position when nothing was saved', async () => {
    expect(await createPositionStore(memoryStorage()).load()).toEqual(defaultPosition);
  });

  it('gives back the edge and height fraction after an app restart', async () => {
    const disk = memoryStorage();

    await createPositionStore(disk).save({ edge: 'left', fraction: 0.31 });

    expect(await createPositionStore(disk).load()).toEqual({ edge: 'left', fraction: 0.31 });
  });

  it('falls back to the default when the saved value is not a position', async () => {
    const disk = memoryStorage({ 'chatButton.position': '{"edge":"top","fraction":7}' });

    expect(await createPositionStore(disk).load()).toEqual(defaultPosition);
  });

  it('falls back to the default when the saved value is not JSON', async () => {
    const disk = memoryStorage({ 'chatButton.position': 'not json' });

    expect(await createPositionStore(disk).load()).toEqual(defaultPosition);
  });
});

describe('when the device storage fails', () => {
  const broken: KeyValueStorage = {
    getItem: () => Promise.reject(new Error('disk read failed')),
    setItem: () => Promise.reject(new Error('disk write failed')),
  };

  it('loads the default position instead of throwing, so the button still shows', async () => {
    expect(await createPositionStore(broken).load()).toEqual(defaultPosition);
  });

  it('drops a failed save quietly instead of leaving a rejected promise', async () => {
    await expect(createPositionStore(broken).save({ edge: 'left', fraction: 0.5 })).resolves.toBeUndefined();
  });
});
