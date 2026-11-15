import type { SecondaryStorage } from 'better-auth';
import type { Redis } from 'ioredis';
import { z } from 'zod';

export const KEY_PREFIX = 'auth:';

export function valkeyStorage(valkey: Redis): SecondaryStorage {
  return {
    get: (key) => valkey.get(KEY_PREFIX + key),
    // GETDEL, not GET then DEL: two requests with the same email code could both read it before
    // either deletes it, and the code would sign someone in twice.
    getAndDelete: (key) => valkey.getdel(KEY_PREFIX + key),
    increment: async (key, ttl) => {
      const results = await valkey.multi().incr(KEY_PREFIX + key).expire(KEY_PREFIX + key, ttl, 'NX').exec();

      return z.number().parse(results?.[0]?.[1]);
    },
    set: async (key, value, ttl) => {
      if (ttl === undefined) {
        await valkey.set(KEY_PREFIX + key, value);
      } else {
        await valkey.set(KEY_PREFIX + key, value, 'EX', ttl);
      }
    },
    delete: async (key) => {
      await valkey.del(KEY_PREFIX + key);
    },
  };
}
