import { z } from 'zod';

export const DependencyStatus = z.enum(['up', 'down']);

export type DependencyStatus = z.infer<typeof DependencyStatus>;

export const HealthResponse = z.object({
  status: z.enum(['ok', 'degraded']),
  checks: z.object({
    postgres: DependencyStatus,
    valkey: DependencyStatus,
    queue: DependencyStatus,
  }),
});

export type HealthResponse = z.infer<typeof HealthResponse>;
