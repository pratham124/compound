import { ServerWorkout, WorkoutParams, Unauthenticated, WorkoutNotFound, type UserId } from '@compound/contracts';
import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import type pg from 'pg';

import { withUser } from '../identity/profileStore.ts';
import { readWorkout } from './workoutStore.ts';

export type WorkoutsOptions = {
  apiPool: pg.Pool;
  signedInUserId: (request: FastifyRequest) => Promise<UserId | null>;
};

export const workouts: FastifyPluginAsync<WorkoutsOptions> = async (app, { apiPool, signedInUserId }) => {
  app.withTypeProvider<ZodTypeProvider>().get(
    '/workouts/:id',
    { schema: { params: WorkoutParams, response: { 200: ServerWorkout, 401: Unauthenticated, 404: WorkoutNotFound } } },
    async (request, reply) => {
      const userId = await signedInUserId(request);

      if (userId === null) {
        return reply.code(401).send({ error: 'unauthenticated' });
      }

      const workout = await withUser(apiPool, userId, (query) => readWorkout(query, { userId, workoutId: request.params.id }));

      return workout ?? reply.code(404).send({ error: 'not-found' });
    },
  );
};
