import { blinkOffsets } from './blink.ts';

describe('blinkOffsets', () => {
  it('a 100ms blink in a 2s cycle starts closing at 95% and is shut at 97.5%', () => {
    expect(blinkOffsets({ everyMs: 2000, durationMs: 100 })).toEqual({ closeFrom: 95, closed: 97.5 });
  });

  it('a 200ms blink in a 1s cycle starts closing at 80% and is shut at 90%', () => {
    expect(blinkOffsets({ everyMs: 1000, durationMs: 200 })).toEqual({ closeFrom: 80, closed: 90 });
  });
});
