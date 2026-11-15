import { defaultPosition, positionSchema, type ButtonPosition } from './position.ts';

const KEY = 'chatButton.position';

export type KeyValueStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
};

export type PositionStore = {
  load: () => Promise<ButtonPosition>;
  save: (position: ButtonPosition) => Promise<void>;
};

export function createPositionStore(storage: KeyValueStorage): PositionStore {
  return {
    async load() {
      try {
        const stored = await storage.getItem(KEY);

        if (stored === null) {
          return defaultPosition;
        }

        const parsed = positionSchema.safeParse(JSON.parse(stored));

        return parsed.success ? parsed.data : defaultPosition;
      } catch {
        return defaultPosition;
      }
    },
    async save(position) {
      try {
        await storage.setItem(KEY, JSON.stringify(position));
      } catch {
        // Losing a saved position only costs the user a re-drag, so a failed write isn't worth an error.
      }
    },
  };
}
