export type PressTracker = {
  /** A finger went down: begins a new press and returns its id. */
  start: () => number;
  /** The finger came up or the touch was taken away. */
  end: () => void;
  /** Whether the hold that finished for this press id may confirm: true once, and only for the press still being held. */
  tryConfirm: (id: number) => boolean;
  /** Whether the current press has already confirmed. */
  confirmed: () => boolean;
};

/**
 * Keeps one press's hold from being confirmed by something that belongs to another. The hold's completion arrives from the UI
 * thread after the fact, so by then the finger may have lifted, or lifted and come down again for a new press.
 */
export function createPressTracker(): PressTracker {
  let latest = 0;
  let pressing = false;
  let confirmed = false;

  return {
    start() {
      latest += 1;
      pressing = true;
      confirmed = false;

      return latest;
    },
    end() {
      pressing = false;
    },
    tryConfirm(id) {
      if (id !== latest || !pressing || confirmed) {
        return false;
      }

      confirmed = true;

      return true;
    },
    confirmed() {
      return confirmed;
    },
  };
}
