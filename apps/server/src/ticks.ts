import { z } from 'zod';

const Tick = z.discriminatedUnion('kind', [z.object({ kind: z.literal('test'), sentAt: z.iso.datetime() })]);

export type Tick = z.infer<typeof Tick>;

export type TickLogger = {
  info: (fields: { tick: Tick }, message: string) => void;
};

export function parseTick(body: string): Tick {
  return Tick.parse(JSON.parse(body));
}

export function handleTick(tick: Tick, logger: TickLogger): void {
  switch (tick.kind) {
    case 'test':
      logger.info({ tick }, 'test tick received');

      return;
    default: {
      const _exhaustive: never = tick.kind;

      return _exhaustive;
    }
  }
}
